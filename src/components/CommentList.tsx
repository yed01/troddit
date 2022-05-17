//a virtualized list version of Comments.tsx
import useWindowScroll from "@react-hook/window-scroll";

import { List, useMasonry, usePositioner, useResizeObserver } from "masonic";
import { useLayoutEffect, useState } from "react";
import { useMainContext } from "../MainContext";
import ChildComments from "./ChildComments";
const CommentList = ({
  comments,
  scrollRef,
  containerRef,
  depth = 0,
  op = "",
  portraitMode = false,
}) => {
  const context:any = useMainContext();
  const { width, height } = useSize(containerRef,[portraitMode, context?.wideUI]);
  const { scrollTop, isScrolling } = useScroller(scrollRef);
  const positioner = usePositioner({
    width: width,
    columnWidth: width,
    columnGutter: 0,
  });
  const resizeObserver = useResizeObserver(positioner);

  const [allComments, setallComments] = useState(() => {
    return comments.map((c) => {
      c["depth"] = depth;
      c["op"] = op;
      c["portraitMode"] = portraitMode;
      return c;
    });
  });
  return (
    <>
      {useMasonry({
        positioner,
        resizeObserver,
        items: allComments,
        height,
        scrollTop,
        isScrolling,
        overscanBy: 6,
        render: CommentCard,
        className: "outline-none"
      })}
    </>
  );
};

const CommentCard = ({ index, data }) => {
  return (
    <div className="min-w-full py-1 ">
      <ChildComments
        comment={data}
        depth={data?.depth ?? 0}
        hide={false}
        op={data?.op ?? ""}
        portraitMode={data?.portraitMode ?? false}
      />
    </div>
  );
};

const defaultSize = { width: 0, height: 0 };
const useSize = <T extends HTMLElement = HTMLElement>(
  ref: React.MutableRefObject<T | null>,
  deps: any[] = []
): { width: number; height: number } => {
  const [size, setSize] = useState<{ width: number; height: number }>(
    defaultSize
  );

  useLayoutEffect(() => {
    const { current } = ref;

    if (current) {
      const handleResize = () => {
        const computedStyle = getComputedStyle(current);
        const float = parseFloat;
        const width =
          current.clientWidth -
          float(computedStyle.paddingTop) -
          float(computedStyle.paddingBottom);
        const height =
          current.clientHeight -
          float(computedStyle.paddingLeft) -
          float(computedStyle.paddingRight);
        setSize({ height, width });
      };

      handleResize();
      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps.concat(ref.current));

  return size;
};
export const useScroller = <T extends HTMLElement = HTMLElement>(
  ref: React.MutableRefObject<T | null>
): { scrollTop: number; isScrolling: boolean } => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  useLayoutEffect(() => {
    const { current } = ref;
    let tick: number | undefined;

    if (current) {
      const handleScroll = () => {
        if (tick) return;
        tick = window.requestAnimationFrame(() => {
          setScrollTop(current.scrollTop);
          tick = void 0;
        });
      };

      current.addEventListener("scroll", handleScroll);
      return () => {
        current.removeEventListener("scroll", handleScroll);
        if (tick) window.cancelAnimationFrame(tick);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current]);

  useLayoutEffect(() => {
    setIsScrolling(true);
    const to = window.setTimeout(() => {
      // This is here to prevent premature bail outs while maintaining high resolution
      // unsets. Without it there will always bee a lot of unnecessary DOM writes to style.
      setIsScrolling(false);
    }, 1000 / 6);
    return () => window.clearTimeout(to);
  }, [scrollTop]);

  return { scrollTop, isScrolling };
};

export default CommentList;
