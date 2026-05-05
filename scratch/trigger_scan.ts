import { scanResumes } from '../src/app/dashboard/ai-scoring/actions';

async function main() {
  console.log('Starting AI scan...');
  const result = await scanResumes();
  console.log('Result:', result);
}

main().catch(console.error);
