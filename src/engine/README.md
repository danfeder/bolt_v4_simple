# Scheduling Engine

This directory contains the core scheduling engine components:

- `chromosome.ts` - Chromosome representation for the genetic algorithm
- `population.ts` - Population management functionality
- `fitness.ts` - Fitness evaluation based on hard and soft constraints
- `geneticOperators.ts` - Crossover and mutation operators
- `scheduler.ts` - Main scheduling engine API

The engine uses a simplified genetic algorithm with the following characteristics:
- Simple chromosome representation where each gene represents a class assignment
- Fixed-size population with tournament selection
- Streamlined fitness function that heavily penalizes hard constraints
- Basic crossover and mutation operators
