export type Product = {
    id: string;
    name: string;
    price: number;
    description: string;
    image: number;
    category: 'Fish' | 'Shellfish' | 'Crustacean' | 'Cephalopod';
    rating: number;
    isAvailable: boolean;
    isFeatured: boolean;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export const mockCategories: Category[] = [
  { id: '1', name: 'Fish', icon: '🐟' },
  { id: '2', name: 'Shellfish', icon: '🦪' },
  { id: '3', name: 'Crustacean', icon: '🦀' },
  { id: '4', name: 'Cephalopod', icon: '🦑' },
];

export const mockProducts: Product[] = [
    {
        id: '1',
        name: 'Crispy Shrimp',
        price: 99.99,
        description: "These Crispy Breaded Shrimp are seriously addictive, with the perfect flavor and crunch! They're super simple to prepare and make a great appetizer or main dish.",
        image: require('@/assets/images/crispy-shrimp.jpg'),
        category: 'Crustacean',
        rating: 4.5,
        isAvailable: true,
        isFeatured: true,

    },
    {
        id: '2',
        name: 'Teryaki Salmon',
        price: 99.99,
        description: "Teriyaki Salmon requires only a few ingredients and minimal effort but packs fantastic flavor. Moist and tender with a sweet and savory glaze, it's sure to be a dinner hit!",
        image: require('@/assets/images/teryaki-salmon.jpg'),
        category: 'Fish',
        rating: 4.5,
        isAvailable: true,
        isFeatured: true,

    },
    {
        id: '3',
        name: 'Fish Ball',
        price: 99.99,
        description: "Fish balls are a popular street food in the Philippines and are so ingrained in our food culture that every Filipino has, for sure, some \"fishball\" childhood memory.",
        image: require('@/assets/images/crispy-shrimp.jpg'),
        category: 'Fish',
        rating: 4.5,
        isAvailable: true,
        isFeatured: true,

    },
    {
        id: '4',
        name: 'Sinabawang Tahong',
        price: 99.99,
        description: "Sinabawang Tahong is a light and refreshing soup with mussels cooked in a ginger-based broth. Prepare your taste buds for a delightful dish that's great for any weather!",
        image: require('@/assets/images/sinabawang-tahong.jpg'),
        category: 'Shellfish',
        rating: 4.5,
        isAvailable: true,
        isFeatured: true,

    },
    {
        id: '5',
        name: 'Rellenong Alimango',
        price: 99.99,
        description: "Rellenong Alimango, or Stuffed Crab, is a show-stopping appetizer worth the effort. This stuffed crab filled with crab meat and veggies is perfect for a party or for a special date night.",
        image: require('@/assets/images/crispy-shrimp.jpg'),
        category: 'Crustacean',
        rating: 4.5,
        isAvailable: true,
        isFeatured: true,

    },
    {
        id: '6',
        name: 'Bangus a la Pobre',
        price: 99.99,
        description: "Bangus a la Pobre! Fried to golden perfection and topped with a tangy and savory sauce, onions, and crispy garlic, it's a full-flavored dish that's perfect with steamed rice.",
        image: require('@/assets/images/bangus-a-la-pobre.jpg'),
        category: 'Fish',
        rating: 4.5,
        isAvailable: true,
        isFeatured: true,

    },
    {
        id: '7',
        name: 'Sisig Pusit',
        price: 99.99,
        description: "Are you looking for the ultimate party food? Sisig Pusit is juicy and tender and bursting with spicy and smoky flavors. It's delicious as an appetizer with an ice-cold beer or a main dish with steamed rice.",
        image: require('@/assets/images/sisig-pusit.jpg'),
        category: 'Cephalopod',
        rating: 4.5,
        isAvailable: true,
        isFeatured: true,

    },

]