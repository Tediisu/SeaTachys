import { createContext, useContext, useMemo, useState } from 'react';

export type CartOption = {
  id: string;
  groupLabel: string;
  choiceName: string;
  additionalPrice: number;
};

export type CartItem = {
  id: string;
  menuItemId: string;
  name: string;
  image?: string | number | null;
  category: string;
  basePrice: number;
  quantity: number;
  specialInstructions?: string;
  options: CartOption[];
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateInstructions: (id: string, instructions: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextType | null>(null);

function buildCartItemId(item: Omit<CartItem, 'id'>) {
  const optionKey = item.options.map((option) => option.id).sort().join('-');
  return `${item.menuItemId}:${optionKey}:${item.specialInstructions ?? ''}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, 'id'>) => {
    const id = buildCartItemId(item);

    setItems((current) => {
      const existing = current.find((entry) => entry.id === id);
      if (existing) {
        return current.map((entry) =>
          entry.id === id ? { ...entry, quantity: entry.quantity + item.quantity } : entry
        );
      }

      return [...current, { ...item, id }];
    });
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const updateInstructions = (id: string, instructions: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, specialInstructions: instructions } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const optionsTotal = item.options.reduce((total, option) => total + option.additionalPrice, 0);
        return sum + (item.basePrice + optionsTotal) * item.quantity;
      }, 0),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateInstructions,
        clearCart,
        subtotal,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
