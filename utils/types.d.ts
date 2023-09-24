declare module "javascript-lp-solver" {
  /** a constraint definition */
  export interface Constraint {
    /** the minimum value of the constraint */
    min?: number;
    /** the max value of the constraint */
    max?: number;
  }

  /**
   * a variable definition
   *
   * A mapping of all the constraints or objective values that it contributes
   * to.
   */
  export type Variable = Record<string, number>;

  /** a description of an lp */
  export interface Model {
    /** the variable to optimize */
    optimize: string;
    /** the optimize type */
    opType: "max" | "min";
    /** all constraints */
    constraints: Record<string, Constraint>;
    /** all variables */
    variables: Record<string, Variable>;
    /** integer variables */
    ints?: Record<string, 1>;
  }

  /** special keys of the result */
  export interface BaseResult {
    /** if solution was feasible */
    feasible: boolean;
    /** the optimal value */
    result: number;
    /** if the solution was bounded */
    bounded: boolean;
    /** if the solution was integral */
    isIntegral?: boolean;
  }

  /** the result of an optimization */
  export type Result = BaseResult & Record<string, number>;

  /** function to solve an LP */
  export function Solve(args: Model): Result;
}
