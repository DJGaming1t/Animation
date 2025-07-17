import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MathUtils } from "../../utils/MathUtils";

interface FractalTreesProps {
  count: number;
  complexity: number;
  time: number;
}

interface TreeNode {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  thickness: number;
  generation: number;
  children: TreeNode[];
  angle: number;
}

/**
 * Procedural fractal tree generation with L-systems
 * Creates organic tree structures with recursive branching
 */
export default function FractalTrees({ count, complexity, time }: FractalTreesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const treesRef = useRef<THREE.Group[]>([]);

  // Tree generation parameters
  const treeParams = useMemo(() => ({
    maxGenerations: Math.min(complexity, 6),
    lengthReduction: 0.7,
    thicknessReduction: 0.6,
    branchingAngle: Math.PI * 0.3,
    branchingProbability: 0.8,
    minLength: 0.5,
    minThickness: 0.05,
    windStrength: 0.5
  }), [complexity]);

  // Generate fractal tree structure
  const generateTree = useMemo(() => {
    return (
      startPos: THREE.Vector3,
      startDir: THREE.Vector3,
      length: number,
      thickness: number,
      generation: number,
      maxGen: number,
      seed: number
    ): TreeNode => {
      const node: TreeNode = {
        position: startPos.clone(),
        direction: startDir.clone(),
        length,
        thickness,
        generation,
        children: [],
        angle: seed
      };

      if (generation >= maxGen || length < treeParams.minLength) {
        return node;
      }

      // Calculate end position
      const endPos = startPos.clone().add(startDir.clone().multiplyScalar(length));

      // Generate branches
      const branchCount = generation === 0 ? 2 : Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < branchCount; i++) {
        if (Math.random() < treeParams.branchingProbability) {
          // Calculate branch direction
          const baseAngle = i * (Math.PI * 2 / branchCount);
          const variation = (Math.random() - 0.5) * treeParams.branchingAngle;
          const branchAngle = baseAngle + variation;
          
          // Create rotation matrix for branch direction
          const rotationAxis = new THREE.Vector3(
            Math.sin(branchAngle),
            0,
            Math.cos(branchAngle)
          ).normalize();
          
          const branchDir = startDir.clone();
          branchDir.applyAxisAngle(rotationAxis, treeParams.branchingAngle);
          branchDir.normalize();

          // Add some upward bias
          branchDir.y += 0.2;
          branchDir.normalize();

          const newLength = length * (treeParams.lengthReduction + Math.random() * 0.2);
          const newThickness = thickness * treeParams.thicknessReduction;
          const newSeed = seed + i * 0.1 + generation * 0.01;

          const branch = generateTree(
            endPos,
            branchDir,
            newLength,
            newThickness,
            generation + 1,
            maxGen,
            newSeed
          );

          node.children.push(branch);
        }
      }

      return node;
    };
  }, [treeParams]);

  // Generate tree data
  const trees = useMemo(() => {
    const treeData = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 30 + Math.random() * 40;
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );

      const initialDirection = new THREE.Vector3(0, 1, 0);
      const initialLength = 5 + Math.random() * 8;
      const initialThickness = 0.8 + Math.random() * 0.4;
      const seed = i * 0.1;

      const tree = generateTree(
        position,
        initialDirection,
        initialLength,
        initialThickness,
        0,
        treeParams.maxGenerations,
        seed
      );

      treeData.push({
        id: i,
        root: tree,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random() * 0.5
      });
    }

    return treeData;
  }, [count, treeParams, generateTree]);

  // Create branch geometry
  const createBranchGeometry = useMemo(() => {
    return (node: TreeNode) => {
      const segments = 8;
      const radialSegments = 6;
      
      const geometry = new THREE.CylinderGeometry(
        node.thickness * 0.3, // Top radius (tapered)
        node.thickness,       // Bottom radius
        node.length,
        radialSegments,
        segments
      );

      // Add some organic irregularity
      const positions = geometry.attributes.position;
      const vertex = new THREE.Vector3();

      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);
        
        // Add slight irregularity to trunk
        const noise = (Math.random() - 0.5) * 0.1;
        vertex.x += noise * vertex.y / node.length;
        vertex.z += noise * vertex.y / node.length;
        
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }

      geometry.computeVertexNormals();
      return geometry;
    };
  }, []);

  // Materials for different tree parts
  const materials = useMemo(() => ({
    trunk: new THREE.MeshLambertMaterial({
      color: "#8B4513",
      roughness: 0.8
    }),
    branch: new THREE.MeshLambertMaterial({
      color: "#A0522D",
      roughness: 0.7
    }),
    twig: new THREE.MeshLambertMaterial({
      color: "#CD853F",
      roughness: 0.6
    }),
    leaves: new THREE.MeshLambertMaterial({
      color: "#228B22",
      transparent: true,
      opacity: 0.8
    })
  }), []);

  // Create tree mesh recursively
  const createTreeMesh = useMemo(() => {
    return (node: TreeNode, parentGroup: THREE.Group, windOffset: number = 0) => {
      const geometry = createBranchGeometry(node);
      
      // Choose material based on generation
      let material;
      if (node.generation === 0) material = materials.trunk;
      else if (node.generation < 3) material = materials.branch;
      else material = materials.twig;

      const mesh = new THREE.Mesh(geometry, material);
      
      // Position and orient the branch
      mesh.position.copy(node.position);
      mesh.position.y += node.length / 2;
      
      // Orient towards direction
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(up, node.direction);
      mesh.setRotationFromQuaternion(quaternion);

      // Add wind animation
      const windSway = Math.sin(time * (1 + windOffset) + node.angle) * 
                      treeParams.windStrength * (1 / (node.generation + 1));
      mesh.rotation.z += windSway * 0.1;
      mesh.rotation.x += windSway * 0.05;

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parentGroup.add(mesh);

      // Add leaves to terminal branches
      if (node.children.length === 0 && node.generation > 2) {
        const leafGeometry = new THREE.SphereGeometry(node.length * 0.3, 4, 3);
        const leafMesh = new THREE.Mesh(leafGeometry, materials.leaves);
        leafMesh.position.set(0, node.length, 0);
        leafMesh.castShadow = true;
        mesh.add(leafMesh);
      }

      // Recursively create child branches
      node.children.forEach((child, index) => {
        createTreeMesh(child, parentGroup, windOffset + index * 0.1);
      });
    };
  }, [createBranchGeometry, materials, time, treeParams]);

  // Update tree animations
  useFrame(() => {
    if (!groupRef.current) return;

    trees.forEach((tree, index) => {
      const treeGroup = treesRef.current[index];
      if (!treeGroup) return;

      // Clear previous meshes
      treeGroup.clear();

      // Recreate tree with current time for wind animation
      createTreeMesh(tree.root, treeGroup);

      // Overall tree swaying
      const sway = Math.sin(time * tree.swaySpeed + tree.swayPhase) * 0.02;
      treeGroup.rotation.z = sway;
      treeGroup.rotation.x = sway * 0.5;
    });
  });

  return (
    <group ref={groupRef}>
      {trees.map((tree, index) => (
        <group
          key={tree.id}
          ref={(group) => {
            if (group) treesRef.current[index] = group;
          }}
        />
      ))}
    </group>
  );
}
