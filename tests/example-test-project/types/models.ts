export interface User {
  name: string;
}

export interface Cart {
  items: CartItem[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}
export interface Product {
  id: number;
  name: string;
  descriptions: string[];
  description: string;
  price: number;
}
