namespace SeaTachys.Domain.Enums;

public enum UserRole{ customer, admin, rider }
public enum OrderStatus
{
    pending, confirmed, preparing, ready_for_pickup, picked_up, on_the_way, delivered, cancelled
}

public enum PaymentMethod { gcash, paymongo, cash_on_delivery }
public enum PaymentStatus { pending, paid, failed, refunded }
public enum RiderStatus { available, busy, offline }  