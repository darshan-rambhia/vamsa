import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { useTreeKeyboardNav } from "./useTreeKeyboardNav";
import type { ChartEdge, ChartNode } from "~/server/charts";

describe("useTreeKeyboardNav", () => {
  // Test data: Simple 3-generation tree
  //       A (root)
  //      / \
  //     B   C
  //    /     \
  //   D       E
  const createTestNodes = (): Array<ChartNode> => [
    {
      id: "A",
      firstName: "Root",
      lastName: "Person",
      dateOfBirth: "1950-01-01",
      dateOfPassing: null,
      isLiving: true,
      photoUrl: null,
      gender: "male",
      generation: 0,
    },
    {
      id: "B",
      firstName: "Child",
      lastName: "One",
      dateOfBirth: "1975-01-01",
      dateOfPassing: null,
      isLiving: true,
      photoUrl: null,
      gender: "female",
      generation: 1,
    },
    {
      id: "C",
      firstName: "Child",
      lastName: "Two",
      dateOfBirth: "1977-01-01",
      dateOfPassing: null,
      isLiving: true,
      photoUrl: null,
      gender: "male",
      generation: 1,
    },
    {
      id: "D",
      firstName: "Grandchild",
      lastName: "One",
      dateOfBirth: "2000-01-01",
      dateOfPassing: null,
      isLiving: true,
      photoUrl: null,
      gender: "female",
      generation: 2,
    },
    {
      id: "E",
      firstName: "Grandchild",
      lastName: "Two",
      dateOfBirth: "2002-01-01",
      dateOfPassing: null,
      isLiving: true,
      photoUrl: null,
      gender: "male",
      generation: 2,
    },
  ];

  const createTestEdges = (): Array<ChartEdge> => [
    { id: "edge1", source: "A", target: "B", type: "parent-child" },
    { id: "edge2", source: "A", target: "C", type: "parent-child" },
    { id: "edge3", source: "B", target: "D", type: "parent-child" },
    { id: "edge4", source: "C", target: "E", type: "parent-child" },
  ];

  describe("initialization", () => {
    it("should initialize with first node focused when no rootNodeId provided", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
        })
      );

      expect(result.current.focusedNodeId).toBe("A");
    });

    it("should initialize with rootNodeId focused when provided", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "C",
        })
      );

      expect(result.current.focusedNodeId).toBe("C");
    });

    it("should not focus when disabled", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          enabled: false,
        })
      );

      expect(result.current.focusedNodeId).toBeNull();
    });

    it("should return correct containerProps", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      expect(result.current.containerProps).toEqual({
        role: "tree",
        tabIndex: 0,
        "aria-activedescendant": "A",
        onKeyDown: expect.any(Function),
      });
    });

    it("should return correct nodeProps", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
        })
      );

      const nodeProps = result.current.getNodeProps("A");
      expect(nodeProps).toEqual({
        role: "treeitem",
        id: "A",
        "aria-selected": false,
      });
    });
  });

  describe("arrow key navigation", () => {
    it("should navigate down with ArrowDown", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      expect(result.current.focusedNodeId).toBe("A");

      act(() => {
        result.current.handleKeyDown({
          key: "ArrowDown",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedNodeId).toBe("B");
    });

    it("should navigate up with ArrowUp", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      // First navigate down to B
      act(() => {
        result.current.handleKeyDown({
          key: "ArrowDown",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedNodeId).toBe("B");

      // Then navigate back up to A
      act(() => {
        result.current.handleKeyDown({
          key: "ArrowUp",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedNodeId).toBe("A");
    });

    it("should navigate to first child with ArrowRight", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      expect(result.current.focusedNodeId).toBe("A");

      act(() => {
        result.current.handleKeyDown({
          key: "ArrowRight",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedNodeId).toBe("B");
    });

    it("should navigate to parent with ArrowLeft", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      // Navigate down to B first
      act(() => {
        result.current.handleKeyDown({
          key: "ArrowDown",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedNodeId).toBe("B");

      // Then navigate left to parent (A)
      act(() => {
        result.current.handleKeyDown({
          key: "ArrowLeft",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedNodeId).toBe("A");
    });

    it("should not move when at boundary with ArrowUp", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      expect(result.current.focusedNodeId).toBe("A");

      const preventDefaultMock = mock();

      act(() => {
        result.current.handleKeyDown({
          key: "ArrowUp",
          preventDefault: preventDefaultMock,
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      // Should stay at A since there's no previous node
      expect(result.current.focusedNodeId).toBe("A");
      expect(preventDefaultMock).not.toHaveBeenCalled();
    });

    it("should not move when no parent exists with ArrowLeft", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      expect(result.current.focusedNodeId).toBe("A");

      const preventDefaultMock = mock();

      act(() => {
        result.current.handleKeyDown({
          key: "ArrowLeft",
          preventDefault: preventDefaultMock,
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      // Should stay at A since it's the root
      expect(result.current.focusedNodeId).toBe("A");
      expect(preventDefaultMock).not.toHaveBeenCalled();
    });
  });

  describe("Home and End keys", () => {
    it("should jump to first node with Home key", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      // Navigate to a different node first
      act(() => {
        result.current.setFocusedNode("E");
      });

      expect(result.current.focusedNodeId).toBe("E");

      act(() => {
        result.current.handleKeyDown({
          key: "Home",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedNodeId).toBe("A");
    });

    it("should jump to last visible node with End key", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      expect(result.current.focusedNodeId).toBe("A");

      act(() => {
        result.current.handleKeyDown({
          key: "End",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedNodeId).toBe("E");
    });
  });

  describe("Enter and Space keys", () => {
    it("should call onActivate when Enter is pressed", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();
      const onActivate = mock();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
          onActivate,
        })
      );

      act(() => {
        result.current.handleKeyDown({
          key: "Enter",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      expect(onActivate).toHaveBeenCalledWith("A");
    });

    it("should call onSelect and update selectedNodeId when Space is pressed", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();
      const onSelect = mock();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
          onSelect,
        })
      );

      expect(result.current.selectedNodeId).toBeNull();

      act(() => {
        result.current.handleKeyDown({
          key: " ",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith("A");
      expect(result.current.selectedNodeId).toBe("A");
    });

    it("should update aria-selected for selected node", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();
      const onSelect = mock();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
          onSelect,
        })
      );

      // Select node A
      act(() => {
        result.current.handleKeyDown({
          key: " ",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      const nodeAProps = result.current.getNodeProps("A");
      expect(nodeAProps["aria-selected"]).toBe(true);

      const nodeBProps = result.current.getNodeProps("B");
      expect(nodeBProps["aria-selected"]).toBe(false);
    });
  });

  describe("focus management", () => {
    it("should allow manual focus setting", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      expect(result.current.focusedNodeId).toBe("A");

      act(() => {
        result.current.setFocusedNode("C");
      });

      expect(result.current.focusedNodeId).toBe("C");
    });

    it("should update aria-activedescendant when focus changes", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      expect(result.current.containerProps["aria-activedescendant"]).toBe("A");

      act(() => {
        result.current.setFocusedNode("B");
      });

      expect(result.current.containerProps["aria-activedescendant"]).toBe("B");
    });
  });

  describe("complex tree structures", () => {
    it("should handle deep nested trees", () => {
      // Create a deeper tree: A -> B -> C -> D -> E (linear)
      const nodes: Array<ChartNode> = ["A", "B", "C", "D", "E"].map((id) => ({
        id,
        firstName: `Person ${id}`,
        lastName: "Test",
        dateOfBirth: "2000-01-01",
        dateOfPassing: null,
        isLiving: true,
        photoUrl: null,
        gender: "male",
      }));

      const edges: Array<ChartEdge> = [
        { id: "e1", source: "A", target: "B", type: "parent-child" },
        { id: "e2", source: "B", target: "C", type: "parent-child" },
        { id: "e3", source: "C", target: "D", type: "parent-child" },
        { id: "e4", source: "D", target: "E", type: "parent-child" },
      ];

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      // Navigate down the tree
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.handleKeyDown({
            key: "ArrowDown",
            preventDefault: mock(),
            stopPropagation: mock(),
          } as unknown as React.KeyboardEvent);
        });
      }

      expect(result.current.focusedNodeId).toBe("E");

      // Navigate back up
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.handleKeyDown({
            key: "ArrowUp",
            preventDefault: mock(),
            stopPropagation: mock(),
          } as unknown as React.KeyboardEvent);
        });
      }

      expect(result.current.focusedNodeId).toBe("A");
    });

    it("should ignore spouse edges in navigation", () => {
      const nodes = createTestNodes();
      const edges: Array<ChartEdge> = [
        ...createTestEdges(),
        { id: "spouse1", source: "A", target: "F", type: "spouse" },
      ];

      nodes.push({
        id: "F",
        firstName: "Spouse",
        lastName: "Person",
        dateOfBirth: "1952-01-01",
        dateOfPassing: null,
        isLiving: true,
        photoUrl: null,
        gender: "female",
      });

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      // ArrowRight should go to first child (B), not spouse (F)
      act(() => {
        result.current.handleKeyDown({
          key: "ArrowRight",
          preventDefault: mock(),
          stopPropagation: mock(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.focusedNodeId).toBe("B");
    });
  });

  describe("empty and edge cases", () => {
    it("should handle empty node list", () => {
      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes: [],
          edges: [],
        })
      );

      expect(result.current.focusedNodeId).toBeNull();
    });

    it("should handle single node", () => {
      const nodes: Array<ChartNode> = [
        {
          id: "A",
          firstName: "Single",
          lastName: "Person",
          dateOfBirth: "2000-01-01",
          dateOfPassing: null,
          isLiving: true,
          photoUrl: null,
          gender: "male",
        },
      ];

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges: [],
        })
      );

      expect(result.current.focusedNodeId).toBe("A");

      // Try all navigation keys - should stay at A
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

      keys.forEach((key) => {
        act(() => {
          result.current.handleKeyDown({
            key,
            preventDefault: mock(),
            stopPropagation: mock(),
          } as unknown as React.KeyboardEvent);
        });

        expect(result.current.focusedNodeId).toBe("A");
      });
    });

    it("should preventDefault and stopPropagation for handled keys", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      const preventDefaultMock = mock();
      const stopPropagationMock = mock();

      act(() => {
        result.current.handleKeyDown({
          key: "ArrowDown",
          preventDefault: preventDefaultMock,
          stopPropagation: stopPropagationMock,
        } as unknown as React.KeyboardEvent);
      });

      expect(preventDefaultMock).toHaveBeenCalled();
      expect(stopPropagationMock).toHaveBeenCalled();
    });

    it("should not preventDefault for unhandled keys", () => {
      const nodes = createTestNodes();
      const edges = createTestEdges();

      const { result } = renderHook(() =>
        useTreeKeyboardNav({
          nodes,
          edges,
          rootNodeId: "A",
        })
      );

      const preventDefaultMock = mock();
      const stopPropagationMock = mock();

      act(() => {
        result.current.handleKeyDown({
          key: "a",
          preventDefault: preventDefaultMock,
          stopPropagation: stopPropagationMock,
        } as unknown as React.KeyboardEvent);
      });

      expect(preventDefaultMock).not.toHaveBeenCalled();
      expect(stopPropagationMock).not.toHaveBeenCalled();
    });
  });
});
