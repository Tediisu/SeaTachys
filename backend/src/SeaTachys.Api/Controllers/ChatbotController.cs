using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/chatbot")]
[Authorize]
public class ChatbotController : ControllerBase
{
    private const int MaxMessageLength = 1200;
    private const int MaxHistoryMessages = 10;
    private const string SystemPrompt = """
        You are the SeaTachys customer assistant for a seafood ordering app.
        Be helpful, concise, and friendly.
        You can help with menu questions, checkout guidance, order-status explanations, pickup versus delivery,
        and basic account-navigation help.
        Do not invent discounts, availability, prices, delivery times, or order statuses that were not provided.
        If the user needs live account or order data that is not in the conversation, tell them to check the app screen
        or contact store support instead of guessing.
        """;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly DatabaseConnectionString _databaseConnectionString;
    private readonly ChatbotKnowledgeService _chatbotKnowledgeService;

    public ChatbotController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        DatabaseConnectionString databaseConnectionString,
        ChatbotKnowledgeService chatbotKnowledgeService
    )
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _databaseConnectionString = databaseConnectionString;
        _chatbotKnowledgeService = chatbotKnowledgeService;
    }

    [HttpPost("message")]
    public async Task<IActionResult> SendMessage([FromBody] ChatbotRequest request, CancellationToken cancellationToken)
    {
        var message = request.Message?.Trim();

        if (string.IsNullOrWhiteSpace(message))
        {
            return BadRequest("Message is required.");
        }

        if (message.Length > MaxMessageLength)
        {
            return BadRequest($"Message must be {MaxMessageLength} characters or fewer.");
        }

        var baseUrl = (_configuration["Ollama:BaseUrl"] ?? "http://127.0.0.1:11434").TrimEnd('/');
        var model = _configuration["Ollama:Model"] ?? "llama3.2";
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var recentOrders = (await CustomerOrderStore.GetOrdersAsync(
            _databaseConnectionString.Value,
            userId,
            cancellationToken
        ))
            .Take(3)
            .ToList();

        List<KnowledgeDocument> retrievedKnowledge;
        try
        {
            retrievedKnowledge = await _chatbotKnowledgeService.RetrieveAsync(message, cancellationToken);
        }
        catch (HttpRequestException)
        {
            retrievedKnowledge = [];
        }

        var messages = BuildConversation(request.History, message, recentOrders, retrievedKnowledge);
        var client = _httpClientFactory.CreateClient("ollama");

        try
        {
            using var response = await client.PostAsJsonAsync(
                $"{baseUrl}/api/chat",
                new OllamaChatRequest(model, messages, Stream: false),
                cancellationToken
            );

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                return StatusCode(
                    StatusCodes.Status502BadGateway,
                    string.IsNullOrWhiteSpace(body)
                        ? "Ollama returned an unsuccessful response."
                        : $"Ollama returned an unsuccessful response: {body}"
                );
            }

            var data = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(cancellationToken: cancellationToken);
            var reply = data?.Message?.Content?.Trim();

            if (string.IsNullOrWhiteSpace(reply))
            {
                return StatusCode(StatusCodes.Status502BadGateway, "Ollama returned an empty response.");
            }

            return Ok(new ChatbotResponse(reply));
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(StatusCodes.Status504GatewayTimeout, "Ollama took too long to respond.");
        }
        catch (HttpRequestException)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                "Ollama is unavailable. Make sure Ollama is running on the configured host."
            );
        }
    }

    private static List<OllamaMessage> BuildConversation(
        List<ChatMessage>? history,
        string message,
        List<CustomerOrderDto> recentOrders,
        List<KnowledgeDocument> retrievedKnowledge
    )
    {
        var messages = new List<OllamaMessage>
        {
            new("system", SystemPrompt),
            new("system", BuildOrderContext(recentOrders)),
            new("system", BuildKnowledgeContext(retrievedKnowledge))
        };

        if (history is not null)
        {
            messages.AddRange(history
                .Where(item =>
                    (item.Role == "user" || item.Role == "assistant") &&
                    !string.IsNullOrWhiteSpace(item.Content))
                .TakeLast(MaxHistoryMessages)
                .Select(item => new OllamaMessage(item.Role, item.Content.Trim())));
        }

        messages.Add(new OllamaMessage("user", message));
        return messages;
    }

    private static string BuildOrderContext(List<CustomerOrderDto> orders)
    {
        if (orders.Count == 0)
        {
            return "Live customer order data: this user currently has no orders on record.";
        }

        var context = new StringBuilder("Live customer order data for this authenticated user:\n");

        foreach (var order in orders)
        {
            var fulfillmentType = string.IsNullOrWhiteSpace(order.DeliveryStreet) ? "pickup" : "delivery";
            var itemSummary = order.Items.Count == 0
                ? "no items recorded"
                : string.Join(", ", order.Items.Select(item => $"{item.Quantity}x {item.ItemName}"));

            context.AppendLine(
                $"- Order #{order.OrderNumber}: status={order.Status}, type={fulfillmentType}, " +
                $"placedAt={order.PlacedAt:O}, updatedAt={order.UpdatedAt:O}, total={order.TotalAmount:0.00}, items={itemSummary}"
            );
        }

        context.Append(
            "Use only this order data when answering order-status questions. " +
            "If the user asks about an order not listed here, say you cannot see that order in their recent records."
        );

        return context.ToString();
    }

    private static string BuildKnowledgeContext(List<KnowledgeDocument> documents)
    {
        if (documents.Count == 0)
        {
            return "SeaTachys knowledge-base context: no relevant policy document was retrieved for this question.";
        }

        var context = new StringBuilder("SeaTachys knowledge-base context:\n");

        foreach (var document in documents)
        {
            context.AppendLine($"- {document.Title} ({document.Category}): {document.Content}");
        }

        context.Append(
            "Use this retrieved policy context when answering FAQ, refund, or delivery-rule questions. " +
            "If the answer is not supported by the retrieved context, say you do not have enough policy information."
        );

        return context.ToString();
    }
}

public record ChatbotRequest(string Message, List<ChatMessage>? History);
public record ChatMessage(string Role, string Content);
public record ChatbotResponse(string Reply);
public record OllamaChatRequest(string Model, List<OllamaMessage> Messages, bool Stream);
public record OllamaMessage(string Role, string Content);
public record OllamaChatResponse(OllamaMessage? Message);
