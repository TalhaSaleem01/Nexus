import { User, StartupHistory, InvestmentHistory } from "../models/associations.js";

const includeHistory = [
  { model: StartupHistory, as: "startupHistory" },
  { model: InvestmentHistory, as: "investmentHistory" },
];

// @route  GET /api/users/profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
      include: includeHistory,
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/users/profile
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      name,
      bio,
      profilePicture,
      location,
      preferredSectors,
      minTicketSize,
      maxTicketSize,
      startupHistory, // array: [{ name, description, stage, year }]
      investmentHistory, // array: [{ startupName, amount, year, sector }]
    } = req.body;

    const flatFields = {
      name,
      bio,
      profilePicture,
      location,
      preferredSectors,
      minTicketSize,
      maxTicketSize,
    };
    Object.keys(flatFields).forEach((key) => {
      if (flatFields[key] !== undefined) {
        user[key] = flatFields[key];
      }
    });
    await user.save();

    // Replace startup history entries if provided
    if (Array.isArray(startupHistory)) {
      await StartupHistory.destroy({ where: { userId: user.id } });
      if (startupHistory.length > 0) {
        await StartupHistory.bulkCreate(
          startupHistory.map((item) => ({ ...item, userId: user.id }))
        );
      }
    }

    // Replace investment history entries if provided
    if (Array.isArray(investmentHistory)) {
      await InvestmentHistory.destroy({ where: { userId: user.id } });
      if (investmentHistory.length > 0) {
        await InvestmentHistory.bulkCreate(
          investmentHistory.map((item) => ({ ...item, userId: user.id }))
        );
      }
    }

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ["password"] },
      include: includeHistory,
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password", "email"] },
      include: includeHistory,
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};