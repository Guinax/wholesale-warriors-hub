import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import getOrder from "./tools/get-order";
import listMyOrders from "./tools/list-my-orders";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "familia-maromba-mcp",
  title: "Adega Maromba",
  version: "0.1.0",
  instructions:
    "Ferramentas do portal de atacado Adega Maromba. Use `list_products` para navegar no catálogo, `get_order` para consultar um pedido pelo código e `list_my_orders` para ver os pedidos do usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProducts, getOrder, listMyOrders],
});
