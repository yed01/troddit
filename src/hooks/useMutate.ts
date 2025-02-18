import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";
import { useMutation, useQueryClient } from "react-query";
import { fixCommentFormat } from "../../lib/utils";
import {
  hideLink,
  loadMoreComments,
  postComment,
  postVote,
  saveLink,
} from "../RedditAPI";

const useMutate = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session, status } = useSession();

  interface Change {
    property: string;
    value: any;
  }
  const optimisticUpdate = async (
    key: string[],
    id: string,
    change: Change
  ) => {
    // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    await queryClient.cancelQueries();
    // Snapshot the previous value
    const previousData = queryClient.getQueriesData(key);

    // Optimistically update to the new value
    queryClient.setQueriesData(["feed"], (oldData: any) => {
      let newData = oldData;
      if (newData) {
        let newPages = oldData?.pages?.map((page) => {
          return {
            ...page,
            filtered: page?.filtered?.map((post) => {
              if (id === post?.data?.name) {
                post.data[change.property] = change.value;
              }
              return post;
            }),
          };
        });
        newData = { ...newData, pages: newPages };
      }
      return newData;
    });

    return { previousData };
  };

  const voteMutation = useMutation(({ vote, id }: any) => postVote(vote, id), {
    onMutate: async (update) => {
      if (update.id.substring(0, 3) === "t3_") {
        return optimisticUpdate(["feed"], update.id, {
          property: "likes",
          value: update.vote,
        });
      }
    },
    onSuccess: (data: any) => {
      if (data.id.substring(0, 3) === "t3_") {
        if (session?.user?.name) {
          data.vote == 1 &&
            queryClient.invalidateQueries([
              "feed",
              "SELF",
              session.user.name,
              "upvoted",
            ]);
          data.vote == -1 &&
            queryClient.invalidateQueries([
              "feed",
              "SELF",
              session.user.name,
              "downvoted",
            ]);
        } else {
          queryClient.invalidateQueries(["feed"]);
        }
      } else if (data.id.substring(0, 3) === "t1_") {


        const updateCommentValue = (prevData, commentId, key, value) => {
          const iterComments = (comment, commentId, key, value) => {
            if (comment?.data?.name === commentId){
              comment["data"][key] = value; 
              if (key === "likes"){
                comment["data"]["score"] = comment["data"]["score"] + value
              }
              return comment; 
            }
            for (let i = 0; i < comment?.data?.replies?.data?.children?.length ?? 0; i++){
               iterComments(comment?.data?.replies?.data?.children[i], commentId, key, value);
            }
            return comment; 
          }

          let newpages = prevData?.pages?.map(page => {return {...page, comments: page.comments?.map((comment) => iterComments(comment, commentId, key, value)) }})
          return {...prevData, pages: newpages }
        }

        const path = router?.asPath?.split("/");
        const cIndex = path?.indexOf("comments");
        let postId;
        if (cIndex) {
          postId = path?.[cIndex + 1] as string;
        }


        //this check could be better
        postId?.match(/[A-z0-9]/g)?.length === 6
          ? queryClient.setQueriesData(["thread", postId], (prevData) => updateCommentValue(prevData, data.id, "likes", data.vote ))
          : queryClient.invalidateQueries(["thread"]);
      }
    },
    onError: (err, update, context: any) => {
      if (update.id.substring(0, 3) === "t3_") {
        queryClient.setQueriesData(["feed"], context.previousData);
      }
    },
  });

  const saveMutation = useMutation(
    ({ id, isSaved }: any) => saveLink("", id, isSaved),
    {
      onMutate: async (update) => {
        if (update.id.substring(0, 3) === "t3_") {
          return optimisticUpdate(["feed"], update.id, {
            property: "saved",
            value: update.isSaved ? false : true,
          });
        }
      },
      onSuccess: (data: any) => {
        if (
          data?.id?.substring(0, 3) === "t3_" &&
          session?.user?.name &&
          router.asPath !== `/u/${session.user.name}/saved`
        ) {
          queryClient.invalidateQueries([
            "feed",
            "SELF",
            session.user.name,
            "saved",
          ]);
        }
      },
      onError: (err, update, context: any) => {
        if (update.id.substring(0, 3) === "t3_") {
          queryClient.setQueriesData(["feed"], context.previousData);
        }
      },
    }
  );

  const hideMutation = useMutation(
    ({ id, isHidden }: any) => hideLink(id, isHidden),
    {
      onMutate: async (update) => {
        return optimisticUpdate(["feed"], update.id, {
          property: "hidden",
          value: update.isHidden ? false : true,
        });
      },
      onSuccess: (data: any) => {
        if (
          session?.user?.name &&
          router.asPath !== `/u/${session.user.name}/hidden`
        ) {
          queryClient.invalidateQueries([
            "feed",
            "SELF",
            session.user.name,
            "hidden",
          ]);
        }
      },
      onError: (err, update, context: any) => {
        queryClient.setQueriesData(["feed"], context.previousData);
      },
    }
  );

  

  const postCommentMutation = useMutation(
    ({ parent, textValue, postName }: any) => postComment(parent, textValue),
    {
      onSuccess: (data: any) => {
        if (session?.user?.name) {
          queryClient.invalidateQueries([
            "feed",
            "SELF",
            session.user.name,
            "comments",
          ]);
        }

        if (data?.parent_id?.substring?.(0, 3) === "t3_") {
          // const pCommentsData = queryClient.getQueriesData(["thread",data?.parent_id?.substring?.(3)]);
          // let newCommentsData = pCommentsData.map(pComments => )
          queryClient.setQueriesData(
            ["thread", data?.parent_id?.substring?.(3)],
            (pCommentsData: any) => {
              let newCommentsData = pCommentsData?.pages?.map((page: any) => {
                return {
                  ...page,
                  comments: [{ kind: "t1", data: data }, ...page.comments],
                };
              });
              return { ...pCommentsData, pages: newCommentsData };
            }
          );
        } else if (data?.parent_id?.substring?.(0, 3) === "t1_") {
      

          queryClient.setQueriesData(
            ["thread", data?.link_id?.substring?.(3)],
            (pCommentsData: any) => 
            {
              const editNestedComment = (comment, data, parent_id) => {
                if (comment.data.name === parent_id) {
                  comment["data"]["replies"]["data"]["children"] = [
                    { kind: "t1", data: data },
                    ...comment?.data?.replies?.data?.children,
                  ];
                }
                if (
                  comment.kind === "t1" &&
                  comment?.data?.replies?.data?.children?.length > 0
                ) {
                  for (
                    let i = 0;
                    i < comment.data.replies.data.children.length;
                    i++
                  ) {
                    comment.data.replies.data.children[i] = editNestedComment(
                      comment.data.replies.data.children[i],
                      data,
                      parent_id
                    );
                  }
                }
                return comment;
              };

              let found = false;
              let newCommentsData = pCommentsData?.pages?.map((page: any) => {
                return {
                  ...page,
                  comments: page.comments.map((comment: any) => {
                    if (found) return comment;
                    if (comment?.data?.name === data.parent_id) {
                      comment["data"]["replies"]["data"]["children"] = [
                        { kind: "t1", data: data },
                        ...comment?.data?.replies?.data?.children,
                      ];
                      found = true;

                      return comment;
                    }
                    if (comment?.data?.replies?.data?.children) {
                      return {
                        ...comment,

                        data: {
                          ...comment.data,
                          replies: {
                            ...comment.data.replies,
                            data: {
                              ...comment.data.replies.data,
                              children:
                                comment?.data?.replies?.data?.children?.map(
                                  (cComment) =>
                                    editNestedComment(
                                      cComment,
                                      data,
                                      data.parent_id
                                    )
                                ),
                            },
                          },
                        },
                      };
                    } else {
                      return comment;
                    }
                  }),
                };
              });
              return { ...pCommentsData, pages: newCommentsData };
            }
          );
          //queryClient.invalidateQueries(["thread",data?.link_id?.substring(3)]);
        }
      },
    }
  );

  const dummy = async () => "";
  const editNestedCommentProperty = (
    name,
    comment,
    property,
    value,
    found: boolean,
    updateChildren = false
  ) => {
    if (found) {
      return [comment, found];
    }
    if (comment?.data?.name && comment?.data?.name == name) {
      if (updateChildren){
        comment["data"]["replies"]["data"]["children"] =  [
          ...comment?.data?.replies?.data?.children?.filter(child => child.kind === "t1"),
          ...value,
        ]; 
      } else {
        comment["data"][property] = value;

      }
      found = true;
    }
    if (
      comment.kind === "t1" &&
      comment?.data?.replies?.data?.children?.length > 0
    ) {
      for (let i = 0; i < comment.data.replies.data.children.length; i++) {
        let [c, f] = editNestedCommentProperty(
          name,
          comment.data.replies.data.children[i],
          property,
          value,
          found,
          updateChildren
        );
        found = f;
        comment.data.replies.data.children[i] = c;
      }
    }
    return [comment, found];
  };
  const updateCommentProperty = (pCommentsData, name, property, value, updateChildren = false) => {
    let found = false;
    let newCommentsData = pCommentsData?.pages?.map((page: any) => {
      return {
        ...page,
        comments: page.comments.map((comment: any) => {
          if (found) return comment;
          let [c, f] = editNestedCommentProperty(
            name,
            comment,
            property,
            value,
            found, 
            updateChildren
          );
          found = f;
          return c;
        }),
      };
    });
    return { ...pCommentsData, pages: newCommentsData };
  };
  const commentCollapse = useMutation(
    ({ name, thread, collapse }: any) => dummy(),
    {
      onMutate: async (update) => {
        queryClient.setQueriesData(
          ["thread", update.thread],
          (pCommentsData: any) =>
            updateCommentProperty(
              pCommentsData,
              update.name,
              "collapsed",
              update.collapse
            )
        );
      },
    }
  );

  const loadChildComments = async (
    parentName,
    children: any[],
    link_id,
    permalink,
    childcomments,
    token?
  ) => {
  

    const filterExisting = (comments, childcomments) => {
      return comments.filter((comment: any) => {
        return !childcomments.find((cComment: any) => {
          return cComment?.kind === "more"
            ? false
            : cComment?.data?.name === comment?.data?.name;
        });
      });
    };

    let childrenstring = children.join();
    const data = await loadMoreComments(
      childrenstring,
      link_id,
      permalink,
      session ? true : false,
      token
    );
    let morecomments = data?.data;
    let formatted;
    if (morecomments?.[0]?.data?.replies?.data?.children) {
      const filtered = filterExisting(
        morecomments?.[0]?.data?.replies?.data?.children,
        childcomments
      );
      formatted = filtered;
    } else {
      formatted = await fixCommentFormat(morecomments);
    }
    return {
      link_id: link_id,
      parentName: parentName,
      newComments: formatted,
      newToken: data?.token,
    };
  };
  const loadCommentsMutation = useMutation(
    ({ parentName, children, link_id, permalink, childcomments, token }: any) =>
      loadChildComments(
        parentName,
        children,
        link_id,
        permalink,
        childcomments,
        token
      ),
    {
      onSuccess: (data) => {
        queryClient.setQueriesData(
          ["thread", data?.link_id?.substring(3)],
          (pCommentsData: any) =>
            updateCommentProperty(
              pCommentsData,
              data.parentName,
              "",
              data.newComments,
              true
            )
        );
      },
    }
  );

  return {
    voteMutation,
    saveMutation,
    hideMutation,
    postCommentMutation,
    commentCollapse,
    loadCommentsMutation,
  };
};

export default useMutate;
