import type { APIRoute, GetStaticPaths } from 'astro';
import { getSite } from '../../../site';

export const getStaticPaths: GetStaticPaths = () =>
  [...getSite().problemBank.banks.keys()].map((topic) => ({ params: { topic } }));

export const GET: APIRoute = ({ params }) => {
  const bank = getSite().problemBank.banks.get(params.topic ?? '');
  return new Response(JSON.stringify(bank));
};
