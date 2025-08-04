const { User } = require('../models');
const { Op } = require('sequelize'); // Import Op for complex queries if needed

class UserService {
  /**
   * Recursively fetches all descendent user IDs for a given supervisor.
   * This is useful for determining who falls under a supervisor in the organizational hierarchy.
   *
   * @param {string} supervisorId The ID of the supervisor to start from.
   * @param {Array<string>} [acc=[]] Accumulator for descendent IDs.
   * @returns {Promise<Array<string>>} An array of descendent user IDs.
   */
  static async getDescendentUserIds(supervisorId, acc = []) {
    // Find direct supervisees
    const directSupervisees = await User.findAll({
      where: { supervisor: supervisorId },
      attributes: ['id']
    });

    if (directSupervisees.length === 0) {
      return acc;
    }

    const newSuperviseeIds = directSupervisees
      .map(user => user.id)
      .filter(id => !acc.includes(id)); // Avoid duplicates and infinite recursion

    acc.push(...newSuperviseeIds);

    // Recursively get descendents of direct supervisees
    for (const id of newSuperviseeIds) {
      await this.getDescendentUserIds(id, acc);
    }

    return acc;
  }

  /**
   * Fetches the direct supervisor of a given user, optionally by role.
   * @param {string} userId The ID of the user whose supervisor to find.
   * @param {string} [supervisorRole=null] Optional role to filter the supervisor by.
   * @returns {Promise<User|null>} The supervisor user object or null if not found.
   */
  static async getDirectSupervisor(userId, supervisorRole = null) {
    const user = await User.findByPk(userId, {
      include: [{
        model: User,
        as: 'mySupervisor',
        where: supervisorRole ? { role: supervisorRole } : {},
        required: false // Don't require a supervisor to exist
      }]
    });
    return user ? user.mySupervisor : null;
  }

  /**
   * Fetches the supervisor chain upwards for a user, until a specific role or top is reached.
   * Returns an array of supervisor objects.
   * @param {string} userId The ID of the user to start from.
   * @param {string[]} [targetRoles=[]] Optional array of roles to stop at.
   * @returns {Promise<User[]>} An array of supervisor user objects in ascending hierarchy.
   */
  static async getSupervisorChain(userId, targetRoles = []) {
    let currentUser = await User.findByPk(userId);
    const supervisors = [];

    while (currentUser && currentUser.supervisor) {
      const supervisor = await User.findByPk(currentUser.supervisor);
      if (supervisor) {
        supervisors.push(supervisor);
        if (targetRoles.length > 0 && targetRoles.includes(supervisor.role)) {
          break; // Stop if a target role is found
        }
        currentUser = supervisor; // Move up the chain
      } else {
        break; // Supervisor not found, break loop
      }
    }
    return supervisors;
  }
}

module.exports = UserService;