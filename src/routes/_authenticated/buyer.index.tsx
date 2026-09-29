import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/components/workspace';
export const Route=createFileRoute('/_authenticated/buyer/')({head:()=>({meta:[{title:'Buyer Dashboard | ELITEOZ'},{name:'description',content:'Buyer workspace preview for Eliteoz.'},{property:'og:title',content:'Buyer Dashboard | ELITEOZ'},{property:'og:description',content:'Buyer workspace preview for Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <Workspace role="buyer"/>});
