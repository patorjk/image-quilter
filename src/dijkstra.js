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

  path.forEach(nodeToRemove => {
    delete newGraph[nodeToRemove];
    Object.keys(newGraph).forEach((prop) => {
      delete newGraph[prop][nodeToRemove];
    });
  });

  return newGraph;
}

module.exports = { dijkstra, getGraphPath, cutGraph };
