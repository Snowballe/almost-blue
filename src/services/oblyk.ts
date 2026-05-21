import axios from 'axios';
import {OBLYK_API_BASE_URL, OBLYK_API_TOKEN} from '@env';
import {Crag} from '../types/crag';

const client = axios.create({
  baseURL: OBLYK_API_BASE_URL,
  headers: {HttpApiAccessToken: OBLYK_API_TOKEN},
});

export async function searchCrags(query: string): Promise<Crag[]> {
  const {data} = await client.get('/api/v1/public/crags/search', {
    params: {query},
  });
  return data;
}

export async function getCrag(id: number): Promise<Crag> {
  const {data} = await client.get(`/api/v1/public/crags/${id}`);
  return data;
}
