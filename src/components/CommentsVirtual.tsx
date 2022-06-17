import React, { useEffect, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import ChildComments from "./ChildComments";

const rows = new Array(10000)
  .fill(true)
  .map(() => 25 + Math.round(Math.random() * 100));

const CommentsVirtual = ({
  comments,
  scrollRef,
  depth = 0,
  op = "",
  portraitMode = false,
}) => {

  const rowVirtualizer = useVirtualizer({
    count: comments.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 3000,//comments[i],
    overscan: 3,
  });

  const [trackCollapsed, setTrackCollapsed] = useState({});
  const handleCollapse = () => {
    rowVirtualizer.measure(); 
  }

  return (
    <>
      <div
        className="border border-blue-500"
        style={{
          //height: `400`,
          width: `100%`,
          overflow: "visible",
        }}
      >
        <div
          className="border border-green-300"
          style={{
            height: rowVirtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow, i) => {
            return (
              <div
                key={virtualRow.index}
                ref={virtualRow.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div  >
                  Row {virtualRow.index}
                    <ChildComments
                    comment={comments[virtualRow.index]}
                    depth={depth}
                    hide={false}
                    op={op}
                    portraitMode={portraitMode}
                    afterHeightChange={handleCollapse}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default CommentsVirtual;
