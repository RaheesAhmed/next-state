import { useVirtualizer } from "@tanstack/react-virtual";

export function DevToolsPanel<T>() {
  const state = useNextState((state) => state);
  const [history, setHistory] = useState<
    Array<{ state: T; timestamp: number }>
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: history.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 50,
  });

  useEffect(() => {
    setHistory((prev) => [...prev, { state, timestamp: Date.now() }]);
  }, [state]);

  const items = virtualizer.getVirtualItems();

  return (
    <div className="next-state-devtools">
      <div
        ref={scrollRef}
        className="history-list"
        style={{ height: "300px", overflow: "auto" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {items.map((virtualRow) => (
            <div
              key={virtualRow.index}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <StateHistoryItem
                item={history[virtualRow.index]}
                onSelect={() => timeTravel(virtualRow.index)}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="state-inspector">
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </div>
    </div>
  );
}
