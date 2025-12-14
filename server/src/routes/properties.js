import { Router } from "express";
import {
  addUnitToProperty,
  createProperty,
  createPhaseForProperty,
  deletePropertyById,
  deleteUnitFromProperty,
  findPropertyById,
  listProperties,
  addMilestoneToUnit,
  updateMilestoneForUnit,
  updateUnitForProperty
} from "../data/properties.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    data: listProperties()
  });
});

router.post("/", (req, res) => {
  try {
    const property = createProperty(req.body || {});
    res.status(201).json({ data: property });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.get("/:propertyId", (req, res) => {
  const property = findPropertyById(req.params.propertyId);

  if (!property) {
    return res.status(404).json({ error: "Property not found" });
  }

  res.json({ data: property });
});

router.delete("/:propertyId", (req, res) => {
  try {
    deletePropertyById(req.params.propertyId);
    res.status(204).end();
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.delete("/:propertyId/units/:unitId", (req, res) => {
  try {
    const result = deleteUnitFromProperty(req.params.propertyId, req.params.unitId);
    res.json({ data: result });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.post("/:propertyId/units", (req, res) => {
  try {
    const result = addUnitToProperty(req.params.propertyId, req.body || {});
    res.status(201).json({ data: result });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.post("/:propertyId/phases", (req, res) => {
  try {
    const phase = createPhaseForProperty(req.params.propertyId, req.body?.name);
    res.status(201).json({ data: { phase } });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.get("/:propertyId/units/:unitId", (req, res) => {
  const property = findPropertyById(req.params.propertyId);
  const phaseWithUnit = property?.phases.find((phase) =>
    phase.units.some((unit) => unit.id === req.params.unitId)
  );
  const unit = phaseWithUnit?.units.find((unit) => unit.id === req.params.unitId);

  if (!property || !unit) {
    return res.status(404).json({ error: "Unit not found" });
  }

  res.json({
    data: {
      property: { id: property.id, name: property.name, type: property.type },
      phase: phaseWithUnit ? { id: phaseWithUnit.id, name: phaseWithUnit.name } : null,
      unit
    }
  });
});

router.patch("/:propertyId/units/:unitId", (req, res) => {
  try {
    const result = updateUnitForProperty(req.params.propertyId, req.params.unitId, req.body || {});
    res.json({ data: result });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.patch("/:propertyId/units/:unitId/milestones", (req, res) => {
  try {
    const result = updateMilestoneForUnit(
      req.params.propertyId,
      req.params.unitId,
      req.body?.label,
      req.body || {}
    );
    res.json({ data: result });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.post("/:propertyId/units/:unitId/milestones", (req, res) => {
  try {
    const result = addMilestoneToUnit(req.params.propertyId, req.params.unitId, req.body || {});
    res.status(201).json({ data: result });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

export default router;
