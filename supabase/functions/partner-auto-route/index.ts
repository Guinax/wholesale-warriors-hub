import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"authorization,apikey,content-type,x-client-info,x-supabase-api-version"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return json({});
 if(req.method!=="POST")return json({error:"Método inválido"},405);
 const token=req.headers.get("authorization");
 if(!token?.startsWith("Bearer "))return json({error:"Autenticação necessária"},401);
 const apiKey=Deno.env.get("GOOGLE_MAPS_API_KEY");
 if(!apiKey)return json({error:"Serviço de rotas não configurado"},503);
 try{
  const {request_id}=await req.json();
  if(typeof request_id!=="string"||!/^[0-9a-f-]{36}$/i.test(request_id))return json({error:"Pedido inválido"},400);
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:token}}});
  const {data:identity,error:authError}=await supabase.auth.getUser(token.slice(7));
  if(authError||!identity.user)return json({error:"Sessão inválida"},401);
  const {data,error}=await supabase.rpc("partner_command",{p_action:"dashboard",p_payload:{}});
  if(error)return json({error:"Não foi possível consultar o pedido"},403);
  const request=(data?.requests??[]).find((r:{id:string})=>r.id===request_id);
  const store=(data?.stores??[]).find((s:{id:string})=>s.id===request?.store_id);
  if(!request||!store||!["accepted","quoted"].includes(request.status))return json({error:"Pedido indisponível para cotação"},403);
  const valid=(lat:number,lng:number)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
  if(!valid(Number(store.lat),Number(store.lng))||!valid(Number(request.lat),Number(request.lng)))return json({error:"Coordenadas da loja ou entrega indisponíveis"},422);
  // Identical pickup/dropoff coordinates are valid (same building or CEP centroid).
  // Google Routes may omit a driving route for a zero-distance trip.
  if(Number(store.lat)===Number(request.lat)&&Number(store.lng)===Number(request.lng)){
   const {error:quoteError}=await supabase.rpc("partner_command",{p_action:"quote",p_payload:{request_id,route_km:0,eta_minutes:10}});
   if(quoteError)return json({error:quoteError.message},422);
   return json({ok:true,route_km:0,eta_minutes:10});
  }
  const route=await fetch("https://routes.googleapis.com/directions/v2:computeRoutes",{
   method:"POST",headers:{"content-type":"application/json","X-Goog-Api-Key":apiKey,"X-Goog-FieldMask":"routes.distanceMeters,routes.duration"},
   body:JSON.stringify({origin:{location:{latLng:{latitude:Number(store.lat),longitude:Number(store.lng)}}},destination:{location:{latLng:{latitude:Number(request.lat),longitude:Number(request.lng)}}},travelMode:"DRIVE",routingPreference:"TRAFFIC_UNAWARE"})
  });
  if(!route.ok)return json({error:"Não foi possível calcular a rota rodoviária"},502);
  const body=await route.json();const meters=body.routes?.[0]?.distanceMeters;
  if(!Number.isFinite(meters)||meters<=0)return json({error:"Nenhuma rota rodoviária encontrada"},422);
  const km=Math.ceil(meters/100)/10; // round road distance up to 0.1 km
  const seconds=Number(String(body.routes[0].duration??"0s").replace("s",""));
  const minutes=Math.max(10,Math.ceil(seconds/60)||10);
  const {error:quoteError}=await supabase.rpc("partner_command",{p_action:"quote",p_payload:{request_id,route_km:km,eta_minutes:minutes}});
  if(quoteError)return json({error:quoteError.message},422);
  return json({ok:true,route_km:km,eta_minutes:minutes});
 }catch{return json({error:"Não foi possível calcular o frete"},500)}
});