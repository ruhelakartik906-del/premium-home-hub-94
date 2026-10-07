import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RegisterFlow } from '@/components/auth-flow';
export const Route=createFileRoute('/register')({validateSearch:z.object({role:z.string().optional()}),head:()=>({meta:[{title:'Private Access | ELITEOZ'},{name:'description',content:'Request private access to Eliteoz, a verified asset marketplace.'},{property:'og:title',content:'Private Access | ELITEOZ'},{property:'og:description',content:'Request private access to Eliteoz, a verified asset marketplace.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){const {role}=Route.useSearch();return <RegisterFlow initialRole={role??""}/>;}
