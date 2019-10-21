import React, { useState } from 'react';
import gql from 'graphql-tag';
import { Query, useSubscription } from 'react-apollo';

const GET_VOTES = gql`
  query {
    votes {
      id
      title
      ayes
      noes
    }
  }
`;

const VOTE_ADDED = gql`
  subscription VoteAdded($voteId: ID!) {
    voteAdded(voteId: $voteId) {
      id
      title
      ayes
      noes
    }
  }
`;

const App = () => {
  const [hideVotes, setHideVotes] = useState(false);

  setTimeout(() => {
    setHideVotes(true);
  }, 10000);

  if (hideVotes) {
    return <div>That's it</div>;
  }

  return (
    <Query query={GET_VOTES}>
      {({ data, loading }) => {
        if (!data) {
          return null;
        }

        if (loading) {
          return <span>Loading ...</span>;
        }

        return <Votes votes={data.votes} />;
      }}
    </Query>
  );
};

function Votes(props) {
  const { votes } = props;

  return (
    <ul style={{ display: 'flex', flexWrap: 'wrap', listStyle: 'none' }}>
      {votes.map(vote => (
        <Vote key={vote.id} vote={vote} />
      ))}
    </ul>
  );
}

function Vote(props) {
  const { vote } = props;
  const [flashing, setFlashing] = useState(false);

  useSubscription(VOTE_ADDED, {
    variables: { voteId: vote.id },
    onSubscriptionData: ({
      subscriptionData: {
        data: { voteAdded }
      }
    }) => {
      if (voteAdded) {
        setFlashing(true);

        setTimeout(() => {
          setFlashing(false);
        }, 1500);
      }
    }
  });

  return (
    <li
      style={{
        margin: '10px',
        padding: '10px',
        border: '1px solid',
        minWidth: 150,
        minHeight: 150,
        textAlign: 'center'
      }}
    >
      <h1>{vote.title}</h1>
      <p>Total votes: {vote.ayes + vote.noes}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2>Ayes</h2>
          <h3 className={flashing ? 'text' : ''}>{vote.ayes}</h3>
        </div>
        <div>
          <h2>Noes</h2>
          <h3 className={flashing ? 'text' : ''}>{vote.noes}</h3>
        </div>
      </div>
    </li>
  );
}

export default App;
