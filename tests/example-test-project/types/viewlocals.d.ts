import type { Cart, Product, User } from "models.js"

interface _orderOverview {}

interface Test_complex2 {user: User; cart: Cart; featured: Product[]; isAdmin: Boolean;}

interface Test_complex {user: User; cart: Cart; featured: Product[];}

interface Sample {user: User; cart: Cart;}

interface Layout {cart: Cart; user: User; featured: Product[];}

interface Lalilu_X {user: User; cart: Cart;}


export type ViewLocals = {
  "_orderOverview": _orderOverview,
  "test-complex2": Test_complex2,
  "test-complex": Test_complex,
  "sample": Sample,
  "layout": Layout,
  "lalilu/x": Lalilu_X,
};
