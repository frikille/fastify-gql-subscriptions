const fastify = require('fastify');
const GQL = require('fastify-gql');
const mq = require('mqemitter');
const Subscriber = require('./pubsub');

const emitter = mq();
const pubsub = new Subscriber(emitter);

const app = fastify();

const votes = [];

for (let i = 1; i <= 10; i++) {
  votes.push({ id: i, title: `Vote #${i}`, ayes: 0, noes: 0 });
}

app.register(require('fastify-cors'), {
  origin: '*'
});

const VOTE_ADDED = 'VOTE_ADDED';

const schema = `
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

const resolvers = {
  Query: {
    votes: async () => votes
  },
  Mutation: {
    voteAye: async (_, { voteId }) => {
      if (voteId <= votes.length) {
        votes[voteId - 1].ayes++;
        emitter.emit(
          {
            topic: `VOTE_ADDED_${voteId}`,
            payload: {
              voteAdded: votes[voteId - 1]
            }
          },
          () => {}
        );
        return votes[voteId - 1];
      }

      throw new Error('Invalid vote id');
    },
    voteNo: async (_, { voteId }) => {
      if (voteId <= votes.length) {
        votes[voteId - 1].noes++;
        emitter.emit(
          {
            topic: `VOTE_ADDED_${voteId}`,
            payload: {
              voteAdded: votes[voteId - 1]
            }
          },
          () => {
            console.log('emit callback');
          }
        );
        return votes[voteId - 1];
      }

      throw new Error('Invalid vote id');
    }
  },
  Subscription: {
    voteAdded: {
      // resolve: (parent, args, context, info) => {
      //   return parent.voteAdded;
      // },
      subscribe: (root, args, context) => {
        // console.log('subscribe handler', { context });
        // Must return an async iterator
        const { iterator } = pubsub.subscribe(`VOTE_ADDED_${args.voteId}`);

        return iterator;
      }
    }
  }
};

app.register(GQL, {
  schema,
  resolvers,
  graphiql: true,
  subscription: true
});

app.get('/', async function(req, reply) {
  return reply.send('OK');
});

app.listen(8000);

setInterval(() => {
  const voteId = Math.floor(Math.random() * votes.length) + 1;
  if (Math.random() > 0.5) {
    resolvers.Mutation.voteAye({}, { voteId });
  } else {
    resolvers.Mutation.voteNo({}, { voteId });
  }
}, 1500);
