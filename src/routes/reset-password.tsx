import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/components/auth-flow';
export const Route=createFileRoute('/reset-password')({head:()=>({meta:[{title:'Reset Password | ELITEOZ'},{name:'description',content:'Reset Password with Eliteoz, a verified property marketplace.'},{property:'og:title',content:'Reset Password | ELITEOZ'},{property:'og:description',content:'Reset Password with Eliteoz, a verified property marketplace.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <LoginPage kind="reset-password"/>;}
