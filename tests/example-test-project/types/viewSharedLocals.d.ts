import { User } from './models';
import { Cart } from './models';


export type SharedLocals = {
  user: User;
  cart: Cart;
  isAdmin: boolean;
};