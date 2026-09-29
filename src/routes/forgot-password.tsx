import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/components/auth-flow';
export const Route=createFileRoute('/forgot-password')({head:()=>({meta:[{title:'Forgot Password | ELITEOZ'},{name:'description',content:'Forgot Password with Eliteoz, a verified property marketplace.'},{property:'og:title',content:'Forgot Password | ELITEOZ'},{property:'og:description',content:'Forgot Password with Eliteoz, a verified property marketplace.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <LoginPage kind="forgot-password"/>;}
