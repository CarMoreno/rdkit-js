import React, { Component } from "react";
import { connect } from "react-redux";
import _ from "lodash";
import PropTypes from "prop-types";
import "./MoleculeStructure.css";

class MoleculeStructure extends Component {
  static propTypes = {
    /**
     * Generic properties
     */
    id: PropTypes.string.isRequired,
    className: PropTypes.string,
    svgMode: PropTypes.bool,
    width: PropTypes.number,
    height: PropTypes.number,
    /**
     * RDKit-specific properties
     */
    structure: PropTypes.string.isRequired,
    subStructure: PropTypes.string,
    extraDetails: PropTypes.object,
    drawingDelay: PropTypes.number,
  };

  static defaultProps = {
    subStructure: "",
    className: "",
    width: 250,
    height: 200,
    svgMode: false,
    extraDetails: {},
    drawingDelay: undefined,
  };

  constructor(props) {
    super(props);

    this.MOL_DETAILS = {
      width: this.props.width,
      height: this.props.height,
      bondLineWidth: 1,
      addStereoAnnotation: true,
      ...this.props.extraDetails,
    };

    this.state = {
      svg: undefined,
    };
  }

  draw() {
    if (this.props.drawingDelay) {
      setTimeout(() => {
        this.drawSVGorCanvas();
      }, this.props.drawingDelay);
    } else {
      this.drawSVGorCanvas();
    }
  }

  drawSVGorCanvas() {
    const mol = window.RDKit.get_mol(this.props.structure || "invalid");
    const qmol = window.RDKit.get_qmol(this.props.subStructure || "invalid");

    if (this.props.svgMode && this.isValidMol(mol)) {
      const svg = mol.get_svg_with_highlights(this.getMolDetails(mol, qmol));
      this.setState({ svg });
    } else if (this.isValidMol(mol)) {
      const canvas = document.getElementById(this.props.id);
      mol.draw_to_canvas_with_highlights(canvas, this.getMolDetails(mol, qmol));
    }

    /**
     * Delete C++ mol objects manually
     * https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html#memory-management
     */
    mol.delete();
    qmol.delete();
  }

  isValidMol(mol) {
    return !!mol && mol.is_valid();
  }

  getMolDetails(mol, qmol) {
    if (this.isValidMol(mol) && this.isValidMol(qmol)) {
      const subStructHighlightDetails = JSON.parse(
        mol.get_substruct_matches(qmol)
      );
      const subStructHighlightDetailsMerged = !_.isEmpty(
        subStructHighlightDetails
      )
        ? subStructHighlightDetails.reduce(
            (acc, { atoms, bonds }) => ({
              atoms: [...acc.atoms, ...atoms],
              bonds: [...acc.bonds, ...bonds],
            }),
            { bonds: [], atoms: [] }
          )
        : subStructHighlightDetails;
      return JSON.stringify({
        ...this.MOL_DETAILS,
        ...(this.props.extraDetails || {}),
        ...subStructHighlightDetailsMerged,
      });
    } else {
      return JSON.stringify({
        ...this.MOL_DETAILS,
        ...(this.props.extraDetails || {}),
      });
    }
  }

  componentDidMount() {
    if (this.props.rdKitState === "LOADED") {
      this.draw();
    }
  }

  componentDidUpdate(prevProps) {
    const shouldUpdateDrawing =
      (prevProps.rdKitState !== "LOADED" &&
        this.props.rdKitState === "LOADED") ||
      prevProps.structure !== this.props.structure ||
      prevProps.subStructure !== this.props.subStructure ||
      prevProps.width !== this.props.width ||
      prevProps.height !== this.props.height ||
      !_.isEqual(prevProps.extraDetails, this.props.extraDetails);

    if (shouldUpdateDrawing) {
      this.draw();
    }
  }

  render() {
    if (this.props.rdKitState === "ERROR") {
      return "Error loading renderer.";
    }

    if (this.props.rdKitState === "LOADED") {
      const mol = window.RDKit.get_mol(this.props.structure || "invalid");
      const isValidMol = this.isValidMol(mol);
      mol.delete();

      if (!isValidMol) {
        return (
          <span title={`Cannot render structure: ${this.props.structure}`}>
            Render Error.
          </span>
        );
      } else if (this.props.svgMode) {
        return (
          <div
            title={this.props.structure}
            className={"molecule-structure-svg " + (this.props.className || "")}
            style={{ width: this.props.width, height: this.props.height }}
            dangerouslySetInnerHTML={{ __html: this.state.svg }}
          ></div>
        );
      } else {
        return (
          <div
            className={
              "molecule-canvas-container " + (this.props.className || "")
            }
          >
            <canvas
              title={this.props.structure}
              id={this.props.id}
              width={this.props.width}
              height={this.props.height}
            ></canvas>
          </div>
        );
      }
    }

    return "Loading renderer...";
  }
}

const mapStateToProps = ({ rdKitState }) => ({
  rdKitState,
});

export default connect(mapStateToProps)(MoleculeStructure);