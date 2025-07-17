import * as THREE from "three";

/**
 * Simplified physics engine for particle systems and object interactions
 * Implements basic forces, collision detection, and fluid dynamics
 */

export interface PhysicsParticle {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  mass: number;
  radius: number;
  restitution: number; // Bounce factor
  friction: number;
  density: number;
  pressure: number;
  forces: THREE.Vector3[];
  constraints: PhysicsConstraint[];
  userData: Record<string, any>;
}

export interface PhysicsConstraint {
  type: 'distance' | 'spring' | 'collision' | 'boundary';
  particles: string[];
  parameters: Record<string, number>;
}

export interface PhysicsField {
  type: 'gravity' | 'magnetic' | 'electric' | 'wind' | 'vortex';
  position: THREE.Vector3;
  strength: number;
  radius: number;
  direction?: THREE.Vector3;
  parameters?: Record<string, number>;
}

export interface CollisionSphere {
  center: THREE.Vector3;
  radius: number;
  restitution: number;
  friction: number;
}

export interface CollisionPlane {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  restitution: number;
  friction: number;
}

export interface CollisionBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
  restitution: number;
  friction: number;
}

export class PhysicsEngine {
  private particles: Map<string, PhysicsParticle> = new Map();
  private fields: PhysicsField[] = [];
  private collisionSpheres: CollisionSphere[] = [];
  private collisionPlanes: CollisionPlane[] = [];
  private collisionBoxes: CollisionBox[] = [];
  
  private gravity: THREE.Vector3 = new THREE.Vector3(0, -9.81, 0);
  private airDensity: number = 1.225; // kg/m³
  private timeStep: number = 1/60; // Fixed timestep
  private maxVelocity: number = 100;
  private spatialGrid: Map<string, string[]> = new Map();
  private gridSize: number = 5;

  constructor() {
    this.initializeDefaultColliders();
  }

  /**
   * Initialize default collision boundaries
   */
  private initializeDefaultColliders(): void {
    // Ground plane
    this.addCollisionPlane(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      0.3, // restitution
      0.7  // friction
    );

    // Boundary walls
    const boundary = 100;
    this.addCollisionPlane(new THREE.Vector3(-boundary, 0, 0), new THREE.Vector3(1, 0, 0), 0.8, 0.1);
    this.addCollisionPlane(new THREE.Vector3(boundary, 0, 0), new THREE.Vector3(-1, 0, 0), 0.8, 0.1);
    this.addCollisionPlane(new THREE.Vector3(0, 0, -boundary), new THREE.Vector3(0, 0, 1), 0.8, 0.1);
    this.addCollisionPlane(new THREE.Vector3(0, 0, boundary), new THREE.Vector3(0, 0, -1), 0.8, 0.1);
  }

  /**
   * Add a particle to the physics simulation
   */
  addParticle(particle: PhysicsParticle): void {
    this.particles.set(particle.id, particle);
    this.updateSpatialGrid(particle);
  }

  /**
   * Remove a particle from the simulation
   */
  removeParticle(id: string): boolean {
    return this.particles.delete(id);
  }

  /**
   * Get a particle by ID
   */
  getParticle(id: string): PhysicsParticle | undefined {
    return this.particles.get(id);
  }

  /**
   * Get all particles
   */
  getAllParticles(): PhysicsParticle[] {
    return Array.from(this.particles.values());
  }

  /**
   * Add a physics field
   */
  addField(field: PhysicsField): void {
    this.fields.push(field);
  }

  /**
   * Remove all fields of a specific type
   */
  removeFieldsByType(type: PhysicsField['type']): void {
    this.fields = this.fields.filter(field => field.type !== type);
  }

  /**
   * Add collision sphere
   */
  addCollisionSphere(center: THREE.Vector3, radius: number, restitution: number = 0.5, friction: number = 0.3): void {
    this.collisionSpheres.push({ center: center.clone(), radius, restitution, friction });
  }

  /**
   * Add collision plane
   */
  addCollisionPlane(point: THREE.Vector3, normal: THREE.Vector3, restitution: number = 0.5, friction: number = 0.3): void {
    this.collisionPlanes.push({ 
      point: point.clone(), 
      normal: normal.clone().normalize(), 
      restitution, 
      friction 
    });
  }

  /**
   * Add collision box
   */
  addCollisionBox(min: THREE.Vector3, max: THREE.Vector3, restitution: number = 0.5, friction: number = 0.3): void {
    this.collisionBoxes.push({ min: min.clone(), max: max.clone(), restitution, friction });
  }

  /**
   * Set global gravity
   */
  setGravity(gravity: THREE.Vector3): void {
    this.gravity.copy(gravity);
  }

  /**
   * Update spatial grid for collision optimization
   */
  private updateSpatialGrid(particle: PhysicsParticle): void {
    const gridX = Math.floor(particle.position.x / this.gridSize);
    const gridY = Math.floor(particle.position.y / this.gridSize);
    const gridZ = Math.floor(particle.position.z / this.gridSize);
    const gridKey = `${gridX},${gridY},${gridZ}`;
    
    if (!this.spatialGrid.has(gridKey)) {
      this.spatialGrid.set(gridKey, []);
    }
    
    const cell = this.spatialGrid.get(gridKey)!;
    if (!cell.includes(particle.id)) {
      cell.push(particle.id);
    }
  }

  /**
   * Get nearby particles for collision detection
   */
  private getNearbyParticles(particle: PhysicsParticle): PhysicsParticle[] {
    const nearby: PhysicsParticle[] = [];
    const gridX = Math.floor(particle.position.x / this.gridSize);
    const gridY = Math.floor(particle.position.y / this.gridSize);
    const gridZ = Math.floor(particle.position.z / this.gridSize);
    
    // Check surrounding grid cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const gridKey = `${gridX + dx},${gridY + dy},${gridZ + dz}`;
          const cell = this.spatialGrid.get(gridKey);
          if (cell) {
            cell.forEach(id => {
              if (id !== particle.id) {
                const other = this.particles.get(id);
                if (other) nearby.push(other);
              }
            });
          }
        }
      }
    }
    
    return nearby;
  }

  /**
   * Apply forces to particles
   */
  private applyForces(particle: PhysicsParticle, deltaTime: number): void {
    // Reset acceleration
    particle.acceleration.set(0, 0, 0);

    // Apply gravity
    particle.acceleration.add(this.gravity);

    // Apply custom forces
    particle.forces.forEach(force => {
      particle.acceleration.add(force.clone().divideScalar(particle.mass));
    });

    // Apply physics fields
    this.fields.forEach(field => {
      const distance = particle.position.distanceTo(field.position);
      if (distance <= field.radius && distance > 0) {
        const force = this.calculateFieldForce(particle, field, distance);
        particle.acceleration.add(force.divideScalar(particle.mass));
      }
    });

    // Air resistance (simplified)
    const airResistance = particle.velocity.clone()
      .multiplyScalar(-0.5 * this.airDensity * particle.velocity.lengthSq() * 0.01);
    particle.acceleration.add(airResistance.divideScalar(particle.mass));

    // Clear forces for next frame
    particle.forces.length = 0;
  }

  /**
   * Calculate force from physics fields
   */
  private calculateFieldForce(particle: PhysicsParticle, field: PhysicsField, distance: number): THREE.Vector3 {
    const force = new THREE.Vector3();
    const direction = particle.position.clone().sub(field.position).normalize();
    
    switch (field.type) {
      case 'gravity':
        // Gravitational attraction
        force.copy(direction).multiplyScalar(-field.strength / (distance * distance));
        break;
        
      case 'magnetic':
        // Magnetic field (simplified)
        const velocity = particle.velocity.clone();
        force.crossVectors(velocity, field.direction || new THREE.Vector3(0, 1, 0));
        force.multiplyScalar(field.strength * 0.01);
        break;
        
      case 'electric':
        // Electric field
        const charge = particle.userData.charge || 1;
        force.copy(direction).multiplyScalar(field.strength * charge / (distance * distance));
        break;
        
      case 'wind':
        // Wind force
        const windDirection = field.direction || new THREE.Vector3(1, 0, 0);
        force.copy(windDirection).multiplyScalar(field.strength);
        break;
        
      case 'vortex':
        // Vortex/spiral force
        const toCenter = field.position.clone().sub(particle.position);
        const tangent = new THREE.Vector3().crossVectors(toCenter, new THREE.Vector3(0, 1, 0)).normalize();
        force.copy(tangent).multiplyScalar(field.strength);
        force.add(toCenter.normalize().multiplyScalar(field.strength * 0.1));
        break;
    }
    
    return force;
  }

  /**
   * Handle particle-particle collisions
   */
  private handleParticleCollisions(particle: PhysicsParticle): void {
    const nearby = this.getNearbyParticles(particle);
    
    nearby.forEach(other => {
      const distance = particle.position.distanceTo(other.position);
      const minDistance = particle.radius + other.radius;
      
      if (distance < minDistance && distance > 0) {
        // Calculate collision response
        const normal = particle.position.clone().sub(other.position).normalize();
        const relativeVelocity = particle.velocity.clone().sub(other.velocity);
        const velocityAlongNormal = relativeVelocity.dot(normal);
        
        // Don't resolve if velocities are separating
        if (velocityAlongNormal > 0) return;
        
        // Calculate restitution
        const restitution = Math.min(particle.restitution, other.restitution);
        
        // Calculate impulse scalar
        const impulseScalar = -(1 + restitution) * velocityAlongNormal;
        const totalMass = particle.mass + other.mass;
        const impulse = normal.clone().multiplyScalar(impulseScalar / totalMass);
        
        // Apply impulse
        particle.velocity.add(impulse.clone().multiplyScalar(other.mass));
        other.velocity.sub(impulse.clone().multiplyScalar(particle.mass));
        
        // Position correction to prevent sinking
        const penetration = minDistance - distance;
        const correction = normal.clone().multiplyScalar(penetration * 0.5);
        particle.position.add(correction);
        other.position.sub(correction);
      }
    });
  }

  /**
   * Handle collisions with static geometry
   */
  private handleStaticCollisions(particle: PhysicsParticle): void {
    // Sphere collisions
    this.collisionSpheres.forEach(sphere => {
      const distance = particle.position.distanceTo(sphere.center);
      const minDistance = particle.radius + sphere.radius;
      
      if (distance < minDistance) {
        const normal = particle.position.clone().sub(sphere.center).normalize();
        const penetration = minDistance - distance;
        
        // Position correction
        particle.position.add(normal.clone().multiplyScalar(penetration));
        
        // Velocity reflection
        const velocityAlongNormal = particle.velocity.dot(normal);
        if (velocityAlongNormal < 0) {
          const reflection = normal.clone().multiplyScalar(velocityAlongNormal * (1 + sphere.restitution));
          particle.velocity.sub(reflection);
          
          // Apply friction
          const tangentVelocity = particle.velocity.clone().sub(normal.clone().multiplyScalar(particle.velocity.dot(normal)));
          tangentVelocity.multiplyScalar(1 - sphere.friction);
          particle.velocity.copy(normal.clone().multiplyScalar(particle.velocity.dot(normal)).add(tangentVelocity));
        }
      }
    });

    // Plane collisions
    this.collisionPlanes.forEach(plane => {
      const distanceToPlane = particle.position.clone().sub(plane.point).dot(plane.normal);
      
      if (distanceToPlane < particle.radius) {
        const penetration = particle.radius - distanceToPlane;
        
        // Position correction
        particle.position.add(plane.normal.clone().multiplyScalar(penetration));
        
        // Velocity reflection
        const velocityAlongNormal = particle.velocity.dot(plane.normal);
        if (velocityAlongNormal < 0) {
          const reflection = plane.normal.clone().multiplyScalar(velocityAlongNormal * (1 + plane.restitution));
          particle.velocity.sub(reflection);
          
          // Apply friction
          const tangentVelocity = particle.velocity.clone().sub(plane.normal.clone().multiplyScalar(particle.velocity.dot(plane.normal)));
          tangentVelocity.multiplyScalar(1 - plane.friction);
          particle.velocity.copy(plane.normal.clone().multiplyScalar(particle.velocity.dot(plane.normal)).add(tangentVelocity));
        }
      }
    });

    // Box collisions
    this.collisionBoxes.forEach(box => {
      const clampedPos = particle.position.clone().clamp(box.min, box.max);
      const distance = particle.position.distanceTo(clampedPos);
      
      if (distance < particle.radius) {
        const normal = particle.position.clone().sub(clampedPos).normalize();
        const penetration = particle.radius - distance;
        
        // Position correction
        particle.position.add(normal.clone().multiplyScalar(penetration));
        
        // Velocity reflection
        const velocityAlongNormal = particle.velocity.dot(normal);
        if (velocityAlongNormal < 0) {
          const reflection = normal.clone().multiplyScalar(velocityAlongNormal * (1 + box.restitution));
          particle.velocity.sub(reflection);
          
          // Apply friction
          const tangentVelocity = particle.velocity.clone().sub(normal.clone().multiplyScalar(particle.velocity.dot(normal)));
          tangentVelocity.multiplyScalar(1 - box.friction);
          particle.velocity.copy(normal.clone().multiplyScalar(particle.velocity.dot(normal)).add(tangentVelocity));
        }
      }
    });
  }

  /**
   * Apply constraints (springs, distance constraints, etc.)
   */
  private applyConstraints(particle: PhysicsParticle): void {
    particle.constraints.forEach(constraint => {
      switch (constraint.type) {
        case 'distance':
          this.applyDistanceConstraint(particle, constraint);
          break;
        case 'spring':
          this.applySpringConstraint(particle, constraint);
          break;
      }
    });
  }

  /**
   * Apply distance constraint
   */
  private applyDistanceConstraint(particle: PhysicsParticle, constraint: PhysicsConstraint): void {
    if (constraint.particles.length < 2) return;
    
    const otherParticle = this.particles.get(constraint.particles[1]);
    if (!otherParticle) return;
    
    const targetDistance = constraint.parameters.distance || 1;
    const currentDistance = particle.position.distanceTo(otherParticle.position);
    
    if (currentDistance !== targetDistance && currentDistance > 0) {
      const difference = targetDistance - currentDistance;
      const direction = particle.position.clone().sub(otherParticle.position).normalize();
      const correction = direction.multiplyScalar(difference * 0.5);
      
      particle.position.add(correction);
      otherParticle.position.sub(correction);
    }
  }

  /**
   * Apply spring constraint
   */
  private applySpringConstraint(particle: PhysicsParticle, constraint: PhysicsConstraint): void {
    if (constraint.particles.length < 2) return;
    
    const otherParticle = this.particles.get(constraint.particles[1]);
    if (!otherParticle) return;
    
    const restLength = constraint.parameters.restLength || 1;
    const springConstant = constraint.parameters.springConstant || 100;
    const damping = constraint.parameters.damping || 0.1;
    
    const displacement = particle.position.clone().sub(otherParticle.position);
    const currentLength = displacement.length();
    
    if (currentLength > 0) {
      const force = displacement.normalize().multiplyScalar(springConstant * (restLength - currentLength));
      
      // Add damping
      const relativeVelocity = particle.velocity.clone().sub(otherParticle.velocity);
      const dampingForce = displacement.normalize().multiplyScalar(damping * relativeVelocity.dot(displacement.normalize()));
      force.sub(dampingForce);
      
      particle.forces.push(force.clone().negate());
      otherParticle.forces.push(force);
    }
  }

  /**
   * Integrate particle motion using Verlet integration
   */
  private integrateMotion(particle: PhysicsParticle, deltaTime: number): void {
    // Store previous position for Verlet integration
    if (!particle.userData.previousPosition) {
      particle.userData.previousPosition = particle.position.clone();
    }
    
    const previousPosition = particle.userData.previousPosition.clone();
    const currentPosition = particle.position.clone();
    
    // Verlet integration: newPos = 2 * currentPos - previousPos + acceleration * dt²
    const newPosition = currentPosition.clone()
      .multiplyScalar(2)
      .sub(previousPosition)
      .add(particle.acceleration.clone().multiplyScalar(deltaTime * deltaTime));
    
    // Update velocity: velocity = (newPos - previousPos) / (2 * dt)
    particle.velocity.copy(newPosition).sub(previousPosition).divideScalar(2 * deltaTime);
    
    // Clamp velocity to prevent instability
    if (particle.velocity.length() > this.maxVelocity) {
      particle.velocity.normalize().multiplyScalar(this.maxVelocity);
    }
    
    // Update positions
    particle.userData.previousPosition.copy(currentPosition);
    particle.position.copy(newPosition);
  }

  /**
   * Main physics update step
   */
  update(deltaTime: number = this.timeStep): void {
    // Clear spatial grid
    this.spatialGrid.clear();
    
    // Update spatial grid
    this.particles.forEach(particle => {
      this.updateSpatialGrid(particle);
    });
    
    // Physics simulation steps
    this.particles.forEach(particle => {
      // Apply forces
      this.applyForces(particle, deltaTime);
      
      // Apply constraints
      this.applyConstraints(particle);
      
      // Handle collisions
      this.handleParticleCollisions(particle);
      this.handleStaticCollisions(particle);
      
      // Integrate motion
      this.integrateMotion(particle, deltaTime);
    });
  }

  /**
   * Add force to a particle
   */
  addForceToParticle(particleId: string, force: THREE.Vector3): boolean {
    const particle = this.particles.get(particleId);
    if (particle) {
      particle.forces.push(force.clone());
      return true;
    }
    return false;
  }

  /**
   * Add impulse to a particle (instant velocity change)
   */
  addImpulseToParticle(particleId: string, impulse: THREE.Vector3): boolean {
    const particle = this.particles.get(particleId);
    if (particle) {
      particle.velocity.add(impulse.clone().divideScalar(particle.mass));
      return true;
    }
    return false;
  }

  /**
   * Get physics statistics
   */
  getStats(): {
    particleCount: number;
    fieldCount: number;
    colliderCount: number;
    averageVelocity: number;
    totalKineticEnergy: number;
  } {
    let totalVelocity = 0;
    let totalKineticEnergy = 0;
    
    this.particles.forEach(particle => {
      const speed = particle.velocity.length();
      totalVelocity += speed;
      totalKineticEnergy += 0.5 * particle.mass * speed * speed;
    });
    
    return {
      particleCount: this.particles.size,
      fieldCount: this.fields.length,
      colliderCount: this.collisionSpheres.length + this.collisionPlanes.length + this.collisionBoxes.length,
      averageVelocity: this.particles.size > 0 ? totalVelocity / this.particles.size : 0,
      totalKineticEnergy
    };
  }

  /**
   * Reset all particles
   */
  reset(): void {
    this.particles.clear();
    this.fields.length = 0;
    this.spatialGrid.clear();
    this.initializeDefaultColliders();
  }
}
