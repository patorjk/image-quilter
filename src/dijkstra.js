/**
 * An implementation of Dijkstra's algorithm.
 * Based on: https://patrickkarsh.medium.com/dijkstras-shortest-path-algorithm-in-javascript-1621556a3a15
 *
 * @param graph
 * @param start
 * @returns {{}}
 */
function dijkstra(graph, start) {
  // Create an object to store the shortest distance from the start node to every other node
  let distances = {};

  // A set to keep track of all visited nodes
  let visited = new Set();

  // Get all the nodes of the graph
  let nodes = Object.keys(graph);

  // Initially, set the shortest distance to every node as Infinity
  for (let node of nodes) {
    distances[node] = { name: node, dist: Infinity };
  }

  // The distance from the start node to itself is 0
  distances[start].dist = 0;

  // Loop until all nodes are visited
  while (nodes.length) {
    // Sort nodes by distance and pick the closest unvisited node
    nodes.sort((a, b) => distances[a].dist - distances[b].dist);
    let closestNode = nodes.shift();

    // If the shortest distance to the closest node is still Infinity, then remaining nodes are unreachable and we can break
    if (distances[closestNode].dist === Infinity) break;

    // Mark the chosen node as visited
    visited.add(closestNode);

    // For each neighboring node of the current node
    for (let neighbor in graph[closestNode]) {
      // If the neighbor hasn't been visited yet
      if (!visited.has(neighbor)) {
        // Calculate tentative distance to the neighboring node
        let newDistance = distances[closestNode].dist + graph[closestNode][neighbor];

        // If the newly calculated distance is shorter than the previously known distance to this neighbor
        if (newDistance < distances[neighbor].dist) {
          // Update the shortest distance to this neighbor
          distances[neighbor] = { dist: newDistance, prev: closestNode };
        }
      }
    }
  }

  // Return the shortest distance from the start node to all nodes
  return distances;
}

/**
 * Takes in output from the dijkstra function and returns the shortest path.
 *
 * @param endPoint The end point, it will be traced back to the start point.
 * @param distances Output from the dijstra function.
 * @returns {*[]} An array of all of the nodes in the graph.
 */
function getGraphPath(endPoint, distances) {
  const path = [];
  let prev = distances[endPoint]?.prev;

  // attach the endpoint
  path.push(endPoint);

  // add in all the nodes in-between the end point and start point
  while (distances[prev].prev) {
    path.push(prev);
    prev = distances[prev].prev;
  }

  // attach the start point, as long as its not the end point (if it's the same, there's only 1 node in the graph)
  if (prev !== endPoint) {
    path.push(prev);
  }

  return path;
}

function cutGraph(graph, path) {
  const newGraph = structuredClone(graph);
  let prev;

  path.forEach(nodeToRemove => {
    delete newGraph[nodeToRemove];
    Object.keys(newGraph).forEach((prop) => {
      delete newGraph[prop][nodeToRemove];
    });

    if (prev) {
      let prevNums = prev.split("_");
      let curNums = nodeToRemove.split("_");
      if (prevNums[0] !== curNums[0] && prevNums[1] !== curNums[1]) {
        let adj1 = `${prevNums[0]}_${curNums[1]}`;
        let adj2 = `${curNums[0]}_${prevNums[1]}`;

        delete newGraph[adj1][adj2];
        delete newGraph[adj2][adj1];
      }
    }

    prev = nodeToRemove;
  });

  return newGraph;
}

function getOriginalSegmentBorder(cutType, startPoint, endPoint, middle) {
  const startCoords = startPoint.split("_");
  startCoords[0] = parseInt(startCoords[0], 10);
  startCoords[1] = parseInt(startCoords[1], 10);
  const endCoords = endPoint.split("_");
  endCoords[0] = parseInt(endCoords[0], 10);
  endCoords[1] = parseInt(endCoords[1], 10);

  const segment = new Set();

  const verticalEdge = (startRow, endRow, col) => {
    for (let ii = startRow; ii <= endRow; ii++) {
      segment.add(`${ii}_${col}`);
    }
  };

  const horizontalEdge = (startCol, endCol, row) => {
    for (let ii = startCol; ii <= endCol; ii++) {
      segment.add(`${row}_${ii}`);
    }
  };

  if (cutType === "h") {
    horizontalEdge(0, startCoords[1] - 1, 0); // top edge
    verticalEdge(0, endCoords[0], 0); // left edge
    horizontalEdge(0, endCoords[1] - 1, 0); // bottom edge
  } else if (cutType === "v") {
    verticalEdge(0, startCoords[0], 0); // left edge
    horizontalEdge(0, endCoords[1] - 1, 0); // top edge
    verticalEdge(0, endCoords[0], 0); // right edge
  } else if (cutType === "b") {
    horizontalEdge(0, startCoords[1] - 1, startCoords[0]); // bottom edge
    verticalEdge(0, startCoords[0], 0); // left edge
    horizontalEdge(0, endCoords[1], 0); // top edge
    verticalEdge(0, endCoords[0] - 1, endCoords[1]); // right edge
  }

  return Array.from(segment);
}

/**
 * This takes in a dijstra graph that will have nodes that are reachable and unreachable.
 * Give an input set of "nodes", it will return the part of the dijstraGraph that
 * is related to those nodes.
 *
 * @param dijstraGraph
 * @param nodes
 */
function getOriginalSegmentNodes(dijstraGraph, nodes) {
  const infinityNodes = [];
  const finiteNodes = [];

  Object.keys(dijstraGraph).forEach(key => {
    if (isFinite(dijstraGraph[key].dist)) {
      finiteNodes.push(key);
    } else {
      infinityNodes.push(key);
    }
  });

  for (let ii = 0; ii < nodes.length; ii++) {
    let node = nodes[ii];
    if (dijstraGraph[node]) {
      if (isFinite(dijstraGraph[node].dist)) {
        return finiteNodes;
      } else {
        return infinityNodes;
      }
    }
  }

  return []; // all original segment nodes must be along the cut
}

module.exports = { dijkstra, getGraphPath, cutGraph, getOriginalSegmentBorder, getOriginalSegmentNodes };
