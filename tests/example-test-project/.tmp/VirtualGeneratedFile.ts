// Generated TypeScript from Pug AST
import type { User, Cart } from '../types/models'
export function render(locals: { user: User, cart: Cart }) {
  const { user, cart } = locals;
  function orderOverview(cart : Cart) {
    for (const item of cart.items) {
      console.log(item.product.name + ' - ' + item.quantity + ' pcs');
    }
  }
  orderOverview(cart);
  console.log(`Welcome `);
  console.log(user.vliegwiel);
  console.log(`elaba alles goed hier laliu`);
}
