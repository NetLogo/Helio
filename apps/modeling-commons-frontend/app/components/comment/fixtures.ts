import type { Comment, CommentAuthor } from "./types";

const commentText = `Lorem Ipsum is https://www.omar-ibrahim.com simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library in London, took a 1914 Cicero translation and scrambled it to make dummy text for Letraset's Body Type sheets. It has survived not only many decades, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised thanks to these sheets and more recently with desktop publishing software like Aldus PageMaker and Microsoft Word including versions of Lorem Ipsum.Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library in London, took a 1914 Cicero translation and scrambled it to make dummy text for Letraset's Body Type sheets. It has survived not only many decades, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised thanks to these sheets and more recently with desktop publishing software like Aldus PageMaker and Microsoft Word including versions of Lorem Ipsum`;

const authors = [
  { name: "Omar Ibrahim", image: "https://i.pravatar.cc/150?u=omar", url: "/users/user-omar" },
  { name: "Jane Doe", image: "https://i.pravatar.cc/150?u=jane", url: "/users/user-jane" },
  { name: "John Smith", image: "https://i.pravatar.cc/150?u=john", url: "/users/user-john" },
] as const satisfies Array<CommentAuthor>;

const [omar, jane, john] = authors;

export const DEMO_MODEL_ID = "model-demo";

const stampTree = (comment: Comment, parentId?: string, modelId: string = DEMO_MODEL_ID): Comment => ({
  ...comment,
  modelId,
  parentId,
  replies: comment.replies?.map((reply) => stampTree(reply, comment.id, modelId)),
});

export const longComment: Comment = stampTree({
  id: "1",
  author: omar,
  content: commentText,
  createdAt: "2024-03-11T15:30:00",
  likes: 24,
  likedByMe: true,
  permissions: {
    canDelete: true,
    canEdit: true,
  },
  replyPagination: {
    count: 2,
    lastPage: 1,
  },
  replies: [
    {
      id: "2",
      author: jane,
      content: "This is a reply to the comment.",
      createdAt: "2024-03-11T16:02:00",
      likes: 10,
      likedByMe: false,
      replyPagination: {
        count: 0,
        lastPage: 0,
      },
      replies: [
        {
          id: "3",
          author: john,
          content: "And this is a nested reply.",
          createdAt: "2024-03-11T16:45:00",
          likes: 2,
          likedByMe: false,
          replyPagination: {
            count: 0,
            lastPage: 0,
          },
          replies: [],
        },
      ],
    },
    {
      id: "4",
      author: john,
      content: "Short one.",
      createdAt: "2024-03-12T09:15:00",
      likes: 0,
      likedByMe: false,
      replyPagination: {
        count: 0,
        lastPage: 0,
      },
      replies: [],
    },
  ],
});

export const deepThread: Comment = stampTree({
  id: "100",
  author: omar,
  content: "Hot take: tabs are objectively better than spaces. Fight me.",
  createdAt: "2024-03-10T09:00:00",
  likes: 142,
  likedByMe: true,
  replyPagination: {
    count: 4,
    lastPage: 1,
  },
  replies: [
    {
      id: "101",
      author: jane,
      content: "You're wrong and you know it.",
      createdAt: "2024-03-10T09:05:00",
      likes: 89,
      likedByMe: false,
      replyPagination: {
        count: 3,
        lastPage: 1,
      },
      replies: [
        {
          id: "102",
          author: omar,
          content: "Explain yourself.",
          createdAt: "2024-03-10T09:07:00",
          likes: 12,
          likedByMe: false,
          replyPagination: {
            count: 2,
            lastPage: 1,
          },
          replies: [
            {
              id: "103",
              author: jane,
              content:
                "Spaces render identically everywhere. Tabs depend on editor config. That's the whole argument.",
              createdAt: "2024-03-10T09:12:00",
              likes: 54,
              likedByMe: true,
              replyPagination: {
                count: 2,
                lastPage: 0,
              },
              replies: [
                {
                  id: "104",
                  author: john,
                  content: "That's a feature, not a bug. Accessibility.",
                  createdAt: "2024-03-10T09:20:00",
                  likes: 31,
                  likedByMe: false,
                  replyPagination: {
                    count: 1,
                    lastPage: 0,
                  },
                  replies: [
                    {
                      id: "105",
                      author: jane,
                      content: "Ok that's actually a fair point.",
                      createdAt: "2024-03-10T09:25:00",
                      edited: true,
                      likes: 18,
                      likedByMe: false,
                      replyPagination: {
                        count: 1,
                        lastPage: 0,
                      },
                      replies: [
                        {
                          id: "106",
                          author: omar,
                          content: commentText,
                          createdAt: "2024-03-10T09:31:00",
                          likes: 4,
                          likedByMe: false,
                          replyPagination: {
                            count: 0,
                            lastPage: 0,
                          },
                          replies: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: "107",
                  author: omar,
                  content: "Config your editor. It's 2024.",
                  createdAt: "2024-03-10T09:22:00",
                  likes: 6,
                  likedByMe: false,
                  replyPagination: {
                    count: 0,
                    lastPage: 0,
                  },
                  replies: [],
                },
              ],
            },
            {
              id: "108",
              author: john,
              content: "Both of you are wasting your lives.",
              createdAt: "2024-03-10T09:14:00",
              likes: 203,
              likedByMe: true,
              replyPagination: {
                count: 0,
                lastPage: 0,
              },
              replies: [],
            },
          ],
        },
        {
          id: "109",
          author: john,
          content: "Seconded.",
          createdAt: "2024-03-10T09:09:00",
          likes: 3,
          likedByMe: false,
          replyPagination: {
            count: 0,
            lastPage: 0,
          },
          replies: [],
        },
        {
          id: "110",
          author: omar,
          content: "Unfollowed.",
          createdAt: "2024-03-10T09:10:00",
          likes: 0,
          likedByMe: false,
          replyPagination: {
            count: 0,
            lastPage: 0,
          },
          replies: [],
        },
      ],
    },
    {
      id: "111",
      author: john,
      content:
        "My editor converts tabs to spaces on save so I genuinely don't know what I'm using.",
      createdAt: "2024-03-10T10:00:00",
      likes: 77,
      likedByMe: false,
      replyPagination: {
        count: 2,
        lastPage: 0,
      },
      replies: [
        {
          id: "112",
          author: omar,
          content: "This is the correct answer.",
          createdAt: "2024-03-10T10:02:00",
          likes: 9,
          likedByMe: false,
          replyPagination: {
            count: 0,
            lastPage: 0,
          },
          replies: [],
        },
        {
          id: "113",
          author: jane,
          content: "Blissful ignorance.",
          createdAt: "2024-03-10T10:03:00",
          likes: 15,
          likedByMe: true,
          replyPagination: {
            count: 1,
            lastPage: 0,
          },
          replies: [
            {
              id: "114",
              author: john,
              content: "I sleep well.",
              createdAt: "2024-03-10T10:05:00",
              likes: 44,
              likedByMe: false,
              replyPagination: {
                count: 0,
                lastPage: 0,
              },
              replies: [],
            },
          ],
        },
      ],
    },
    {
      id: "115",
      author: jane,
      content: "Locking this thread.",
      createdAt: "2024-03-10T11:00:00",
      likes: 500,
      likedByMe: true,
      replyPagination: {
        count: 0,
        lastPage: 0,
      },
      replies: [],
    },
    {
      id: "116",
      author: john,
      content: "You can't, you're not a mod.",
      createdAt: "2024-03-10T11:01:00",
      likes: 612,
      likedByMe: true,
      replyPagination: {
        count: 0,
        lastPage: 0,
      },
      replies: [],
    },
  ],
});

export const shortComment: Comment = stampTree({
  id: "5",
  author: jane,
  content: "Nice.",
  createdAt: "2024-03-12T11:00:00",
  likes: 1,
  likedByMe: false,
  replyPagination: {
    count: 0,
    lastPage: 0,
  },
  replies: [],
});

export const editedComment: Comment = stampTree({
  id: "6",
  author: omar,
  content: "I fixed a typo in this one.",
  createdAt: "2024-03-12T12:30:00",
  edited: true,
  likes: 3,
  likedByMe: true,
  replyPagination: {
    count: 0,
    lastPage: 0,
  },
  replies: [],
});

export const noRepliesComment: Comment = stampTree({
  id: "7",
  author: john,
  content: "Standalone comment with no thread.",
  createdAt: "2024-03-12T13:00:00",
  likes: 7,
  replyPagination: {
    count: 0,
    lastPage: 0,
  },
  replies: [],
});

export const comments: Array<Comment> = [
  longComment,
  shortComment,
  editedComment,
  noRepliesComment,
];
