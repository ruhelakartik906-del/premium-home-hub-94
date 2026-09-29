import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/components/workspace';
export const Route=createFileRoute('/_authenticated/admin/')({head:()=>({meta:[{title:'Admin Dashboard | ELITEOZ'},{name:'description',content:'Admin workspace preview for Eliteoz.'},{property:'og:title',content:'Admin Dashboard | ELITEOZ'},{property:'og:description',content:'Admin workspace preview for Eliteoz.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <Workspace role="admin"/>});
