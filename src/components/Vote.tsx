import { BiUpvote, BiDownvote } from "react-icons/bi";
import React,{ useState, useEffect, useMemo } from "react";
import { postVote } from "../RedditAPI";
import { useSession } from "next-auth/react";
import { useMainContext } from "../MainContext";
import { useKeyPress } from "../hooks/KeyPress";
import useMutate from "../hooks/useMutate";

const calculateScore = (x: number) => {
  if (x < 1000) {
    return x.toString();
  } else {
    let y = Math.floor(x / 1000);
    let z = (x / 1000).toFixed(1);
    return z.toString() + "k";
  }
};

const Vote = ({
  name,
  likes,
  score,
  size = 6,
  archived = false,
  hideScore = false,
  postindex = undefined,
  postMode = false,
  scoreHideMins = 0,
  postTime = 0
}) => {
  const context: any = useMainContext();
  const { data: session, status } = useSession();
  const aPress = useKeyPress("a");
  const zPress = useKeyPress("z");

  const [voteScore, setVoteScore] = useState("");


  const { voteMutation } = useMutate();


  const [liked, setLiked] = useState<number | undefined>();

  useEffect(() => {
    setLiked(() => {
      if (likes === 1 || likes === true) return 1;
      if (likes === false || likes === -1) return -1;
      return undefined;
    });
  }, [likes, voteMutation.isError]);



  const castVote = async (e, v) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (session && !archived) {
      let postv;
      if (v === liked) {
        postv = 0;
      } else if (v === 1) {
        postv = 1;
      } else if (v === -1) {
        postv = -1;
      }
      setLiked(postv === 1 ? 1 : postv === -1 ? -1 : undefined);
      setVoteScore(calculateScore(score + postv));
      voteMutation.mutate({ vote: postv, id: name });
    
    } else if (!session) {
      context.setLoginModal(true);
    }
  };
  useEffect(() => {
    //postindex > -1 && console.log(postindex, score, likes);
    //setLiked(likes);
    setVoteScore(calculateScore(score));

    return () => {
      //setLiked(undefined);
    };
  }, [score, likes]);

  useEffect(() => {
    if (!context.replyFocus && postMode) {
      if (aPress) {
        castVote(undefined, 1);
      } else if (zPress) {
        castVote(undefined, -1);
      }
    }

    return () => {};
  }, [aPress, zPress, context.replyFocus]);

  const voteDisplay = useMemo(() => {
    let display = voteScore ?? "0"


    if (scoreHideMins > 0 && postTime > 0){
      const now = new Date().getTime()/1000; 
      if ((postTime + (scoreHideMins * 60)) > now){
        display = "Vote"
      }
    }
    return display; 
  }, [voteScore, postTime, scoreHideMins])

  const VoteFilledUp = (
    <svg
      //onClick={(e) => castVote(e, 1)}
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 24 24"
      className={
        (liked === 1 ? " text-th-upvote " : "") +
        ` flex-none  w-${size} h-${size} ${
          !archived
            ? " cursor-pointer hover:text-th-upvote scale-110 hover:scale-100"
            : ""
        }`
      }
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{`${
        !archived ? `unvote ${postMode ? "(a)" : ""}` : "archived"
      }`}</title>
      <path d="M12.781,2.375C12.4,1.9,11.6,1.9,11.219,2.375l-8,10c-0.24,0.301-0.286,0.712-0.12,1.059C3.266,13.779,3.615,14,4,14h2h2 v3v4c0,0.553,0.447,1,1,1h6c0.553,0,1-0.447,1-1v-5v-2h2h2c0.385,0,0.734-0.221,0.901-0.566c0.166-0.347,0.12-0.758-0.12-1.059 L12.781,2.375z"></path>
    </svg>
  );

  const VoteFilledDown = (
    <svg
      //onClick={(e) => castVote(e, -1)}
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 24 24"
      className={
        (liked === -1 ? " text-th-downvote " : " ") +
        ` flex-none w-${size} h-${size} ${
          !archived
            ? " cursor-pointer } hover:text-th-downvote scale-110 hover:scale-100"
            : ""
        } `
      }
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{`${
        !archived ? `unvote ${postMode ? "(v)" : ""}` : "archived"
      }`}</title>
      <path d="M20.901,10.566C20.734,10.221,20.385,10,20,10h-2h-2V7V3c0-0.553-0.447-1-1-1H9C8.447,2,8,2.447,8,3v5v2H6H4 c-0.385,0-0.734,0.221-0.901,0.566c-0.166,0.347-0.12,0.758,0.12,1.059l8,10C11.409,21.862,11.696,22,12,22 s0.591-0.138,0.781-0.375l8-10C21.021,11.324,21.067,10.913,20.901,10.566z"></path>
    </svg>
  );

  return (
    <>
      <button
        onClick={(e) => castVote(e, 1)}
        disabled={archived || voteMutation.isLoading}
      >
        {liked === 1 ? (
          <>{VoteFilledUp}</>
        ) : (
          <BiUpvote
            title={`${
              !archived ? `upvote ${postMode ? "(a)" : ""}` : "archived"
            }`}
            className={
              (liked === 1
                ? " text-th-upvote "
                : liked === -1
                ? " opacity-50 "
                : "") +
              ` flex-none w-${size} h-${size} ${
                !archived
                  ? "cursor-pointer  hover:text-th-upvote hover:scale-110 hover:opacity-100"
                  : " opacity-10 "
              } `
            }
          />
        )}
      </button>

      {!hideScore && (
        <>
          <p
            className={
              (liked === 1
                ? " text-th-upvote "
                : liked === -1
                ? "text-th-downvote "
                : " ") + " text-sm"
            }
          >
            {voteDisplay ?? "Vote"}
          </p>
        </>
      )}
      <button
        onClick={(e) => castVote(e, -1)}
        disabled={archived || voteMutation.isLoading}
      >
        {liked === -1 ? (
          <>{VoteFilledDown}</>
        ) : (
          <BiDownvote
            title={`${
              !archived ? `downvote ${postMode ? "(v)" : ""}` : `archived`
            }`}
            className={
              (liked ? " opacity-50 " : "") +
              ` flex-none w-${size} h-${size} ${
                !archived
                  ? "cursor-pointer  hover:text-th-downvote hover:scale-110 hover:opacity-100"
                  : "opacity-10"
              } `
            }
          />
        )}
      </button>
    </>
  );
};

export default Vote;
