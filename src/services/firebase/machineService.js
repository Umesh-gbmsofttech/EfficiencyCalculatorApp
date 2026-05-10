import { createMachine, editMachine, getMachines, removeMachine } from "./firestore";

export const machineService = {
  list: getMachines,
  create: createMachine,
  update: editMachine,
  remove: removeMachine
};

export default machineService;
