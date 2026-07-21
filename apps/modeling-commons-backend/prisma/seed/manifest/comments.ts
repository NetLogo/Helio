import type { CommentThreadSeed } from './types.js';

// Discussion threads hung off a handful of the most-visited models. The shapes
// deliberately exercise the read UI: a node with more than
// `maximumShownRepliesPerLevel` replies (see-more), a chain deeper than
// `maximumNested` (continue-thread link), an edited comment, likes, a
// version-scoped comment, and a soft-deleted comment kept alive by its replies.
export const COMMENTS: CommentThreadSeed[] = [
  {
    model: 'wolf-sheep',
    comments: [
      {
        key: 'ws-1',
        user: 'maria',
        content:
          'Is the sheep reproduction rate tuned to any real ecosystem, or are the defaults just illustrative?',
        edited: true,
        likedBy: ['uri', 'kenji', 'seth'],
        createdDaysAgo: 40,
        replies: [
          {
            key: 'ws-1-1',
            user: 'uri',
            content:
              "They're illustrative — the point is the qualitative predator-prey cycle, not calibrated demographics.",
            likedBy: ['maria', 'amara'],
            createdDaysAgo: 39,
            replies: [
              {
                key: 'ws-1-1-1',
                user: 'maria',
                content: 'That makes sense, thanks for the quick reply!',
                createdDaysAgo: 39,
              },
            ],
          },
          {
            key: 'ws-1-2',
            user: 'kenji',
            content:
              'If you do want realism, swap the constant birth rate for a density-dependent one — it stabilises the oscillation.',
            likedBy: ['maria'],
            createdDaysAgo: 38,
          },
          {
            key: 'ws-1-3',
            user: 'diego',
            content: '+1, ran into the exact same question when I taught with this.',
            createdDaysAgo: 37,
          },
        ],
      },
      {
        key: 'ws-2',
        user: 'amara',
        content: 'Great teaching model. I used it in an intro complexity course and students loved it.',
        likedBy: ['uri', 'seth', 'maria', 'priya'],
        createdDaysAgo: 20,
      },
      {
        key: 'ws-3',
        user: 'liam',
        content: '(removed)',
        deleted: true,
        createdDaysAgo: 15,
        replies: [
          {
            key: 'ws-3-1',
            user: 'uri',
            content: "Not sure what the parent said, but the grass-regrowth variant might be what you're after.",
            createdDaysAgo: 14,
          },
        ],
      },
    ],
  },
  {
    model: 'fire',
    comments: [
      {
        key: 'fire-1',
        user: 'uri',
        content: 'The density slider makes a lovely phase transition right around 59%.',
        likedBy: ['seth', 'chen', 'maria', 'kenji', 'amara'],
        createdDaysAgo: 60,
        replies: [
          {
            key: 'fire-1-1',
            user: 'seth',
            content: 'That percolation threshold is the whole reason I ship this in week one.',
            likedBy: ['uri'],
            createdDaysAgo: 59,
            replies: [
              {
                key: 'fire-1-1-1',
                user: 'chen',
                content: 'Is 59% specific to the von Neumann neighbourhood here?',
                createdDaysAgo: 58,
                replies: [
                  {
                    key: 'fire-1-1-1-1',
                    user: 'seth',
                    content:
                      'Yes — go to a Moore neighbourhood and the threshold drops noticeably. Worth a follow-up thread.',
                    likedBy: ['chen'],
                    createdDaysAgo: 57,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    model: 'flocking',
    comments: [
      {
        key: 'flock-1',
        user: 'priya',
        content: 'The alignment-vs-cohesion balance is mesmerising to tune. Nice work.',
        versionNumber: 1,
        likedBy: ['uri'],
        createdDaysAgo: 12,
      },
      {
        key: 'flock-2',
        user: 'chen',
        content: 'Any appetite for a 3D port? The emergent lanes would be gorgeous in three dimensions.',
        createdDaysAgo: 8,
      },
    ],
  },
  {
    model: 'virus-network',
    comments: [
      {
        key: 'vn-1',
        user: 'fatima',
        content: 'How does this compare to the compartmental virus model for the same R0?',
        likedBy: ['amara'],
        createdDaysAgo: 25,
        replies: [
          {
            key: 'vn-1-1',
            user: 'amara',
            content:
              'The network version captures super-spreader structure the well-mixed model averages away, so tails are fatter.',
            likedBy: ['fatima', 'uri'],
            createdDaysAgo: 24,
          },
        ],
      },
    ],
  },
];
