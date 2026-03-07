import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: process.env.CI
        ? '../api/openapi.json'
        : 'http://localhost:3000/docs-json',
    },
    output: {
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/schemas',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/client.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useInfinite: false,
          useSuspenseQuery: false,
          signal: true,
        },
        useNamedParameters: true,
      },
      mode: 'tags-split',
      prettier: true,
    },
  },
});
