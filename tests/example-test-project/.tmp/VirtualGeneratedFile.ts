// Generated TypeScript from Pug AST
import type { User, Cart } from '../types/models'
export function render(locals: { user: User, cart: Cart }) {
  const { user, cart } = locals;
  // TODO handle Comment
  function orderOverview(cart : Cart) {
    for (const item of cart.items) {
      console.log(item.product.name + ' - ' + item.quantity + ' pcs');
    }
  }
  // TODO handle Comment
  orderOverview(cart);
  console.log(`Welcome `);
  console.log(user.vlicxcxcxccccegwddddiel);
  console.log(`elaba alles goed hier laliu`);
}
