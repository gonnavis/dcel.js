import { AABB } from "./AABB";
import { pointsInsidePolygon } from "./pointInsidePolygon";

var counter = 0;

/**
 * Face.
 * Don't instantiate this class in your code.
 * it can only be called by the {@link DCEL} class.
 * @class
 * @private
 * @param {DCEL} dcel
 */
function Face(dcel) {

    this.id = counter++;

    this.wedge = null;

    this._area = 0;
    this._areaDirty = true;

    this._vertexlist = [];
    this._vertexlistDirty = true;
    
    this._dcel = dcel;
    this._holes = [];
    this._holesDirty = true;

    this._aabb = null;
    this._aabbDirty = true;

}

Object.defineProperties(Face.prototype, {

    /**
     * face area
     * @memberof Face#
     * @readonly
     * @type {number}
     */
    area: {

        get: function() {

            if (this._areaDirty) {
                var h = this.wedge;
                var a = 0;
                while (h.nexthedge !== this.wedge) {
                    var p1 = h.origin;
                    var p2 = h.nexthedge.origin;
                    a += p1.x * p2.y - p2.x * p1.y;
                    h = h.nexthedge;
                }
                p1 = h.origin;
                p2 = this.wedge.origin;
                a = (a + p1.x * p2.y - p2.x * p1.y) / 2;

                this._area = a;

                this._areaDirty = false;
            }
            
            return this._area;
        }

    },

    /**
     * face area except holes
     * @memberof Face#
     * @readonly
     * @type {number}
     */
    areaExceptHoles: {

        get: function() {

            var holes = this.holes;
            var area = this.area;

            for (var i = 0, l = holes.length; i < l; i++) {
                area += holes[i].area;
            }

            return area;

        }

    },

    /**
     * is this face internal (area > 0)
     * @memberof Face#
     * @readonly
     * @type {boolean}
     */
    internal: {

        get: function() {
            return this.area > 0;
        }

    },

    /**
     * is this face internal (area <= 0)
     * @memberof Face#
     * @readonly
     * @type {boolean}
     */
    external: {
        
        get: function() {
            return this.area <= 0;
        }

    },

    /**
     * vertex list of this face.
     * if this face is internal, vertex order is ccw
     * if this face is external, vertex order is cw
     * @memberof Face#
     * @readonly
     * @type {Vertex[]}
     */
    vertexlist: {

        get: function() {

            if (this._vertexlistDirty) {

                var h = this.wedge;
                var pl = this._vertexlist;
                pl.length = 0;
                pl.push(h.origin);
                while(h.nexthedge !== this.wedge) {
                    h = h.nexthedge;
                    // if(h.prevhedge !== h.twin) {
                        pl.push(h.origin);
                    // }
                }

                this._vertexlistDirty = false;
                
            }

            return this._vertexlist;
            
        }

    },

    /**
     * holes of this face.
     * all of this holes are external faces.
     * @memberof Face#
     * @readonly
     * @type {Face[]}
     */
    holes: {

        get: function() {

            if (this._holesDirty) {

                this._holesDirty = false;
                this._holes.length = 0; // clear

                // skip external or 0 faces
                if (this.internal) {

                    var faces = this._dcel.faces;

                    for (var i = 0, l = faces.length; i < l; i++) {

                        this.tryAddHole(faces[i]);

                    }

                }

            }

            return this._holes;

        }

    },

    /**
     * aabb of this face
     * @memberof Face#
     * @readonly
     * @type {AABB}
     */
    aabb: {

        get: function() {

            if (!this._aabb) {
                this._aabb = new AABB();
            }

            if (this._aabbDirty) {
                this._aabb.reset();
                this._aabb.expands(this.vertexlist);

                this._aabbDirty = false;
            }

            return this._aabb;

        }

    }

});

Object.assign(Face.prototype, {

    tryAddHole: function(f) {

        // if holes dirty, skip try
        if (this._holesDirty) return;

        // hole's external should < 0
        // todo if area === 0, it's an hole??
        if (f.external) {

            if ( this.area > Math.abs(f.area) ) {

                // test aabb first
                if ( this.aabb.containsPoints(f.vertexlist) ) {
                    
                    // here make sure f is inside
                    if( pointsInsidePolygon(this.vertexlist, f.vertexlist) ) {

                        this._holes.push(f);

                    }

                }

            }

        }

    },

    /**
     * is this face is equals another
     * @memberof Face#
     * @param f target face
     * @return {boolean}
     */
    equals: function(f) {
        var list1 = this.vertexlist;
        var list2 = f.vertexlist;

        if (list1.length !== list2.length) {
            return false;
        }

        var l = list1.length;

        for (var offset = 0; offset < l; offset++) {
            for (var i = 0; i < l; i++) {
                if (list1[i] !== list2[(offset + i) % l]) {
                    break;
                }
                if ( i === (l - 1) ) {
                    return true;
                }
            }
        }

        return false;

    },

    dirty: function() {
        this._areaDirty = true;
        this._vertexlistDirty = true;
        this._holesDirty = true;
        this._aabbDirty = true;
    },

    dispose: function() {
        this.wedge = null;
        this._vertexlist.length = 0;
        this._holes.length = 0;
        this._aabb = null;
        this._dcel = null;
    }

});

export {Face};