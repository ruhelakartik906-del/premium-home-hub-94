import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RegisterFlow } from '@/components/auth-flow';
export const Route=createFileRoute('/register')({validateSearch:z.object({role:z.string().optional()}),head:()=>({meta:[{title:'Become a Member | ELITEOZ'},{name:'description',content:'Become a Member with Eliteoz, a verified property marketplace.'},{property:'og:title',content:'Become a Member | ELITEOZ'},{property:'og:description',content:'Become a Member with Eliteoz, a verified property marketplace.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){const {role}=Route.useSearch();return <RegisterFlow initialRole={role}/>;}
