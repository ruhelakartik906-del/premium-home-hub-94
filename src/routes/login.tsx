import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/components/auth-flow';
export const Route=createFileRoute('/login')({head:()=>({meta:[{title:'Log In | ELITEOZ'},{name:'description',content:'Log In with Eliteoz, a verified property marketplace.'},{property:'og:title',content:'Log In | ELITEOZ'},{property:'og:description',content:'Log In with Eliteoz, a verified property marketplace.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <LoginPage kind="login"/>;}
