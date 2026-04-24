import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '@boardsesh/shared-schema';
import { resolvers } from './resolvers/index';

// Create and export schema
export const schema = makeExecutableSchema({ typeDefs, resolvers });
