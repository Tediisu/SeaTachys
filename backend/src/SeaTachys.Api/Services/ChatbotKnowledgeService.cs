using System.Text.Json;
using System.Net.Http.Json;

namespace SeaTachys.Api.Controllers;

public sealed class ChatbotKnowledgeService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly SemaphoreSlim _loadGate = new(1, 1);
    private List<KnowledgeDocument> _documents = [];
    private List<EmbeddedKnowledgeDocument>? _embeddedDocuments;

    public ChatbotKnowledgeService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IWebHostEnvironment environment
    )
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _environment = environment;
        _documents = LoadDocuments();
    }

    public async Task<List<KnowledgeDocument>> RetrieveAsync(string query, CancellationToken cancellationToken)
    {
        if (_documents.Count == 0 || string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        var embeddedDocuments = await GetEmbeddedDocumentsAsync(cancellationToken);
        if (embeddedDocuments.Count == 0)
        {
            return [];
        }

        var queryEmbeddings = await EmbedAsync([query], cancellationToken);
        var queryVector = queryEmbeddings.FirstOrDefault();
        if (queryVector is null || queryVector.Length == 0)
        {
            return [];
        }

        return embeddedDocuments
            .Select(document => new
            {
                document.Document,
                Score = CosineSimilarity(queryVector, document.Vector)
            })
            .OrderByDescending(item => item.Score)
            .Take(2)
            .Select(item => item.Document)
            .ToList();
    }

    private async Task<List<EmbeddedKnowledgeDocument>> GetEmbeddedDocumentsAsync(CancellationToken cancellationToken)
    {
        if (_embeddedDocuments is not null)
        {
            return _embeddedDocuments;
        }

        await _loadGate.WaitAsync(cancellationToken);
        try
        {
            if (_embeddedDocuments is not null)
            {
                return _embeddedDocuments;
            }

            var embeddings = await EmbedAsync(
                _documents.Select(document => document.Content).ToArray(),
                cancellationToken
            );

            _embeddedDocuments = _documents
                .Zip(embeddings, (document, vector) => new EmbeddedKnowledgeDocument(document, vector))
                .ToList();

            return _embeddedDocuments;
        }
        finally
        {
            _loadGate.Release();
        }
    }

    private async Task<double[][]> EmbedAsync(string[] inputs, CancellationToken cancellationToken)
    {
        var baseUrl = (_configuration["Ollama:BaseUrl"] ?? "http://127.0.0.1:11434").TrimEnd('/');
        var model = _configuration["Ollama:EmbeddingModel"] ?? "embeddinggemma";
        var client = _httpClientFactory.CreateClient("ollama");

        using var response = await client.PostAsJsonAsync(
            $"{baseUrl}/api/embed",
            new OllamaEmbedRequest(model, inputs),
            cancellationToken
        );

        response.EnsureSuccessStatusCode();

        var data = await response.Content.ReadFromJsonAsync<OllamaEmbedResponse>(cancellationToken: cancellationToken);
        return data?.Embeddings ?? [];
    }

    private List<KnowledgeDocument> LoadDocuments()
    {
        var path = Path.Combine(_environment.ContentRootPath, "KnowledgeBase", "seatachys-knowledge.json");
        if (!File.Exists(path))
        {
            return [];
        }

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<List<KnowledgeDocument>>(
            json,
            new JsonSerializerOptions(JsonSerializerDefaults.Web)
        ) ?? [];
    }

    private static double CosineSimilarity(double[] left, double[] right)
    {
        if (left.Length == 0 || right.Length == 0 || left.Length != right.Length)
        {
            return 0;
        }

        double dotProduct = 0;
        double leftMagnitude = 0;
        double rightMagnitude = 0;

        for (var i = 0; i < left.Length; i++)
        {
            dotProduct += left[i] * right[i];
            leftMagnitude += left[i] * left[i];
            rightMagnitude += right[i] * right[i];
        }

        if (leftMagnitude == 0 || rightMagnitude == 0)
        {
            return 0;
        }

        return dotProduct / (Math.Sqrt(leftMagnitude) * Math.Sqrt(rightMagnitude));
    }
}

public record KnowledgeDocument(string Id, string Title, string Category, string Content);
public record EmbeddedKnowledgeDocument(KnowledgeDocument Document, double[] Vector);
public record OllamaEmbedRequest(string Model, string[] Input);
public record OllamaEmbedResponse(double[][] Embeddings);
