import express from 'express';
import { createServer } from 'http';
import { PubSub } from 'apollo-server';
import { ApolloServer, gql } from 'apollo-server-express';

const app = express();

const pubsub = new PubSub();
const VOTE_ADDED = 'VOTE_ADDED';

const typeDefs = gql`
  type Vote {
    id: ID!
    title: String!
    ayes: Int
    noes: Int
  }

  type Query {
    votes: [Vote]
  }

  type Mutation {
    voteAye(voteId: ID!): Vote
    voteNo(voteId: ID!): Vote
  }

  type Subscription {
    voteAdded(voteId: ID!): Vote
  }
`;

const votes = [
  { id: '1', title: 'Vote 1', ayes: 0, noes: 0 },
  { id: '2', title: 'Vote 2', ayes: 0, noes: 0 },
  { id: '3', title: 'Vote 3', ayes: 0, noes: 0 },
  { id: '4', title: 'Vote 4', ayes: 0, noes: 0 },
  { id: '5', title: 'Vote 5', ayes: 0, noes: 0 },
  { id: '6', title: 'Vote 6', ayes: 0, noes: 0 },
  { id: '7', title: 'Vote 7', ayes: 0, noes: 0 },
  { id: '8', title: 'Vote 8', ayes: 0, noes: 0 },
  { id: '9', title: 'Vote 9', ayes: 0, noes: 0 },
  { id: '10', title: 'Vote 10', ayes: 0, noes: 0 }
];

const resolvers = {
  Query: {
    votes: async () => votes
  },
  Mutation: {
    voteAye: async (_, { voteId }) => {
      if (voteId <= votes.length) {
        votes[voteId - 1].ayes++;
        pubsub.publish(`VOTE_ADDED_${voteId}`, {
          voteAdded: votes[voteId - 1]
        });
        return votes[voteId - 1];
      }
      throw new Error('Invalid vote id');
    },
    voteNo: async (_, { voteId }) => {
      if (voteId <= votes.length) {
        votes[voteId - 1].noes++;
        pubsub.publish(`VOTE_ADDED_${voteId}`, {
          voteAdded: votes[voteId - 1]
        });
        return votes[voteId - 1];
      }
      throw new Error('Invalid vote id');
    }
  },
  Subscription: {
    voteAdded: {
      subscribe: (_, args) => {
        return pubsub.asyncIterator(`VOTE_ADDED_${args.voteId}`);
      }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers
});

server.applyMiddleware({ app, path: '/graphql' });

const httpServer = createServer(app);
server.installSubscriptionHandlers(httpServer);

httpServer.listen({ port: 8000 }, () => {
  console.log('Apollo Server on http://localhost:8000/graphql');
});

setInterval(() => {
  const voteId = Math.floor(Math.random() * 10) + 1;
  if (Math.random() > 0.5) {
    resolvers.Mutation.voteAye({}, { voteId });
  } else {
    resolvers.Mutation.voteNo({}, { voteId });
  }
}, 1000);
