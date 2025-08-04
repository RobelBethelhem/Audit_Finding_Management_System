const { EscalationRule, RiskLevel, Category, RiskRating, SystemVulnerability, ComplianceGap, RelevantStandard } = require('../models');

class EscalationRuleController {
  async getAll(req, res) {
    try {
      const rules = await EscalationRule.findAll({
        include: [
          { model: RiskLevel },
          { model: Category },
          { model: RiskRating },
          { model: SystemVulnerability },
          { model: ComplianceGap },
          { model: RelevantStandard }
        ]
      });
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const rule = await EscalationRule.findByPk(req.params.id, {
        include: [
          { model: RiskLevel },
          { model: Category },
          { model: RiskRating },
          { model: SystemVulnerability },
          { model: ComplianceGap },
          { model: RelevantStandard }
        ]
      });
      
      if (!rule) {
        return res.status(404).json({ error: 'Escalation rule not found' });
      }
      
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      // Validate required fields
      const { department, escalation_level, days_threshold, escalate_to_role } = req.body;
      
      if (!department || !escalation_level || !days_threshold || !escalate_to_role) {
        return res.status(400).json({ 
          error: 'Department, escalation level, days threshold, and escalate to role are required' 
        });
      }
      
      const rule = await EscalationRule.create(req.body);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const [updated] = await EscalationRule.update(req.body, {
        where: { id: req.params.id }
      });
      
      if (!updated) {
        return res.status(404).json({ error: 'Escalation rule not found' });
      }
      
      const updatedRule = await EscalationRule.findByPk(req.params.id);
      res.json(updatedRule);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const deleted = await EscalationRule.destroy({
        where: { id: req.params.id }
      });
      
      if (!deleted) {
        return res.status(404).json({ error: 'Escalation rule not found' });
      }
      
      res.status(204).json();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async toggleActive(req, res) {
    try {
      const rule = await EscalationRule.findByPk(req.params.id);
      
      if (!rule) {
        return res.status(404).json({ error: 'Escalation rule not found' });
      }
      
      rule.is_active = !rule.is_active;
      await rule.save();
      
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new EscalationRuleController();
