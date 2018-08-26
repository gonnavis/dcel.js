/**
 * dcel.js (https://github.com/shawn0326/dcel.js)
 * @author shawn0326 http://www.halflab.me/
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (factory());
}(this, (function () { 'use strict';

    // by this, internal face is ccw
    function sortByAngle(a, b) {
        return b.angle - a.angle;
    }

    var counter = 0;

    /**
     * Vertex
     * @param {number} x 
     * @param {number} y 
     */
    function Vertex(x, y) {
        this.id = counter++;
        this.x = x;
        this.y = y;
        this.hedgelist = [];
    }

    Object.assign(Vertex.prototype, {

        sortincident: function() {
            this.hedgelist.sort(sortByAngle);
        },

        dispose: function() {
            this.hedgelist.length = 0;
        }

    });

    // half edge angle
    function hangle(dx, dy) {
        var l = Math.sqrt(dx * dx + dy * dy);

        if (dy > 0) {
            return Math.acos(dx / l);
        } else {
            return 2 * Math.PI - Math.acos(dx / l);
        }
    }

    var counter$1 = 0;

    /**
     * Half Edge
     * @param {Vertex} v1 
     * @param {Vertex} v2 
     */
    function Hedge(v1, v2) {
        this.id = counter$1++;
        this.origin = v2;
        this.twin = null;
        this.face = null;
        this.nexthedge = null;
        this.angle = hangle(v2.x - v1.x, v2.y - v1.y);
        this.prevhedge = null;
        this.length = Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
    }

    Object.assign(Hedge.prototype, {

        dispose: function() {
            this.origin = null;
            this.twin = null;
            this.face = null;
            this.nexthedge = null;
            this.prevhedge = null;
        }

    });

    /**
     * AABB 
     */
    function AABB() {

        this.minX = + Infinity;
        this.minY = + Infinity;

        this.maxX = - Infinity;
        this.maxY = - Infinity;

    }

    Object.defineProperties(AABB.prototype, {

        width: {

            get: function() {
                return this.maxX - this.minX;
            }

        },

        height: {

            get: function() {
                return this.maxY - this.minY;
            }

        }

    });

    Object.assign(AABB.prototype, {

        reset: function() {

            this.minX = + Infinity;
            this.minY = + Infinity;

            this.maxX = - Infinity;
            this.maxY = - Infinity;

        },

        expand: function(point) {
        
            this.minX = Math.min(point.x, this.minX);
            this.minY = Math.min(point.y, this.minY);
            this.maxX = Math.max(point.x, this.maxX);
            this.maxY = Math.max(point.y, this.maxY);

        },

        expands: function(points) {

            for (var i = 0, l = points.length; i < l; i++) {
                this.expand(points[i]);
            }

        },

        intersects: function(aabb) {
            return aabb.maxX < this.minX || aabb.minX > this.maxX ||
            aabb.maxY < this.minY || aabb.minY > this.maxY ? false : true;
        },

        containsPoint: function(point) {
            return point.x <= this.maxX && point.x >= this.minX &&
            point.y <= this.maxY && point.y >= this.minY ? true : false;
        },

        containsPoints: function(points) {
            for (var i = 0, l = points.length; i < l; i++) {
                if (!this.containsPoint(points[i])) {
                    return false;
                }
            }
            return true;
        },

        size: function() {
            return {
                width: this.maxX - this.minX,
                height: this.maxY - this.minY
            };
        }

    });

    function pointInsidePolygon(polygonPoints, checkPoint) {
        var counter = 0;
        var i;
        var xinters;
        var p1, p2;
        var pointCount = polygonPoints.length;
        p1 = polygonPoints[0];
     
        for (i = 1; i <= pointCount; i++) {
            p2 = polygonPoints[i % pointCount];
            if (
                checkPoint.x > Math.min(p1.x, p2.x) &&
                checkPoint.x <= Math.max(p1.x, p2.x)
            ) {
                if (checkPoint.y <= Math.max(p1.y, p2.y)) {
                    if (p1.x != p2.x) {
                        xinters =
                            (checkPoint.x - p1.x) *
                                (p2.y - p1.y) /
                                (p2.x - p1.x) +
                            p1.y;
                        if (p1.y == p2.y || checkPoint.y <= xinters) {
                            counter++;
                        }
                    }
                }
            }
            p1 = p2;
        }
        if (counter % 2 == 0) {
            return false;
        } else {
            return true;
        }
    }

    function pointsInsidePolygon(polygonPoints, checkPoints) {

        for (var i = 0, l = checkPoints.length; i < l; i++) {
            if ( !pointInsidePolygon(polygonPoints, checkPoints[i]) ) {
                return false;
            }
        }

        return true;

    }

    var counter$2 = 0;

    /**
     * Face
     */
    function Face(dcel) {

        this.id = counter$2++;

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

        internal: {

            get: function() {
                return this.area > 0;
            }

        },

        external: {
            
            get: function() {
                return this.area < 0;
            }

        },

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

        equals: function(f) {
            var list1 = this.vertexlist;
            var list2 = f.vertexlist;

            if (list1.length !== list2.length) {
                return false;
            }

            var start = list1[0];
            var offset = -1;
            for (var i = 0, l = list2.length; i < l; i++) {
                if ( list2[i] === start ) {
                    offset = i;
                }
            }

            if (offset < 0) {
                return false;
            } else {
                for (var i = 0, l = list1.length; i < l; i++) {
                    if (list1[i] !== list2[(offset + i) % l]) {
                        return false;
                    }
                }
            }

            return true;
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

    /**
     * DCEL
     * @param {Number[]} points [[x1, y1], [x2, y2], ...]
     * @param {Number[]} edges [[start1, end1], [start2, end2]...] starts and ends are indices of points
     */
    function DCEL(points, edges) {

        this.vertices = [];
        this.hedges = [];
        this.faces = [];

        if (points && edges) {
            this.setDatas(points, edges);
        }

    }

    Object.assign(DCEL.prototype, {

        setDatas: function(points, edges) {

            var vertices = this.vertices;
            var hedges = this.hedges;
            var faces = this.faces;

            // Step 1: vertex list creation
            for (var i = 0, l = points.length; i < l; i++) {
                var p = points[i];
                var v = new Vertex(p[0], p[1]);
                vertices.push(v);
            }

            // Step 2: hedge list creation. Assignment of twins and vertices
            for (var i = 0, l = edges.length; i < l; i++) {
                var e = edges[i];
                var h1 = new Hedge(vertices[e[0]], vertices[e[1]]);
                var h2 = new Hedge(vertices[e[1]], vertices[e[0]]);
                h1.twin = h2;
                h2.twin = h1;
                vertices[e[1]].hedgelist.push(h1);
                vertices[e[0]].hedgelist.push(h2);
                hedges.push(h2);
                hedges.push(h1);
            }

            // Step 3: Identification of next and prev hedges
            for (var j = 0, ll = vertices.length; j < ll; j++) {
                var v = vertices[j];
                v.sortincident();
                var l = v.hedgelist.length;
                if (l == 0) continue; // skip vertex that has no edges
                if (l < 2) {
                    v.hedgelist[0].prevhedge = v.hedgelist[0].twin;
                    v.hedgelist[0].twin.nexthedge = v.hedgelist[0];
                } else {
                    for(var i = 0; i < l - 1; i++) {
                        v.hedgelist[i].twin.nexthedge = v.hedgelist[i+1];
                        v.hedgelist[i+1].prevhedge = v.hedgelist[i].twin;
                    }
                    v.hedgelist[l-1].twin.nexthedge = v.hedgelist[0];
                    v.hedgelist[0].prevhedge = v.hedgelist[l-1].twin;
                }
            }

            // Step 4: Face assignment
            var provlist = hedges.slice(0);
            var nh = hedges.length;

            while (nh > 0) {
                var h = provlist.pop();
                nh -= 1;
                // We check if the hedge already points to a face
                if (h.face == null) {
                    var f = new Face(this);
                    // We link the hedge to the new face
                    f.wedge = h;
                    f.wedge.face = f;
                    // And we traverse the boundary of the new face
                    while (h.nexthedge !== f.wedge) {
                        h = h.nexthedge;
                        h.face = f;
                    }
                    faces.push(f);
                }
            }
        },

        /**
         * return internal faces and faces which area equals 0
         */
         areas: function() {
            var result = [], faces = this.faces;
            for (var i = 0, l = faces.length; i < l; i++) {
                var f = faces[i];
                if (!f.external) {
                    result.push(f);
                }
            }
            return result;
        },

        /**
         * dispose
         */
        dispose: function() {

            var vertices = this.vertices;
            var hedges = this.hedges;
            var faces = this.faces;

            for (var i = 0, l = vertices.length; i < l; i++) {
                vertices[i].dispose();
            }

            for (var i = 0, l = hedges.length; i < l; i++) {
                hedges[i].dispose();
            }

            for (var i = 0, l = faces.length; i < l; i++) {
                faces[i].dispose();
            }

            vertices.length = 0;
            hedges.length = 0;
            faces.length = 0;
            
        },

        findVertex: function(x, y) {

            var vertices = this.vertices;
            var vertex;
            for (var i = 0, l = vertices.length; i < l; i++) {
                vertex = vertices[i];
                if(vertex.x === x && vertex.y === y) {
                    return vertex;
                }
            }

            return null;

        },

        findHedge: function(x1, y1, x2, y2) {

            var hedges = this.hedges;
            var hedge, twinHedge;
            for (var i = 0, l = hedges.length; i < l; i++) {
                hedge = hedges[i];
                twinHedge = hedge.twin;
                if (hedge.origin.x === x1 && hedge.origin.y === y1
                && twinHedge.origin.x === x2 && twinHedge.origin.y === y2) {
                    return hedge;
                }
            }

            return null;

        },

        addEdge: function(x1, y1, x2, y2) {
            // todo
        },

        removeEdge: function(x1, y1, x2, y2) {

            var vertices = this.vertices;
            var hedges = this.hedges;
            var faces = this.faces;

            var hedge = this.findHedge(x1, y1, x2, y2);

            if (!hedge) {
                console.warn("splitEdge: found no hedge to split!", x1, y1, x2, y2);
            }

            var twinHedge = hedge.twin;

            // store new faces head
            var head1 = hedge.nexthedge;
            var head2 = twinHedge.nexthedge;
            var useHead1 = true;
            var useHead2 = true;

            // step 1: remove hedge from hedges

            var index = hedges.indexOf(hedge);
            hedges.splice(index, 1);

            var index = hedges.indexOf(twinHedge);
            hedges.splice(index, 1);

            // step 2: remove face from faces
            // notice that two hedges may belong to the same face

            var index = faces.indexOf(hedge.face);
            index > -1 && faces.splice(index, 1);
            hedge.face.dispose();

            var index = faces.indexOf(twinHedge.face);
            index > -1 && faces.splice(index, 1);
            twinHedge.face.dispose();

            // step 3: remove hedge from vertex.hedgelist
            // if vertex.hedgelist.length === 0 remove the vertex
            // else link the next edge

            var index = hedge.origin.hedgelist.indexOf(hedge);
            hedge.origin.hedgelist.splice(index, 1);
            if (hedge.origin.hedgelist.length > 0) {
                if (index === 0) {
                    var h1 = hedge.origin.hedgelist[hedge.origin.hedgelist.length - 1];
                    var h2 = hedge.origin.hedgelist[index];
                } else {
                    var h1 = hedge.origin.hedgelist[index - 1];
                    var h2 = hedge.origin.hedgelist[index % hedge.origin.hedgelist.length];
                }
                h2.prevhedge = h1.twin;
                h1.twin.nexthedge = h2;
            } else {
                var _index = vertices.indexOf(hedge.origin);
                vertices.splice(_index, 1);
                hedge.origin.dispose();
                useHead2 = false;
            }

            var index = twinHedge.origin.hedgelist.indexOf(twinHedge);
            twinHedge.origin.hedgelist.splice(index, 1);
            if (twinHedge.origin.hedgelist.length > 0) {
                if (index === 0) {
                    var h1 = twinHedge.origin.hedgelist[twinHedge.origin.hedgelist.length - 1];
                    var h2 = twinHedge.origin.hedgelist[index];
                } else {
                    var h1 = twinHedge.origin.hedgelist[index - 1];
                    var h2 = twinHedge.origin.hedgelist[index % twinHedge.origin.hedgelist.length];
                }
                h2.prevhedge = h1.twin;
                h1.twin.nexthedge = h2;
            } else {
                var _index = vertices.indexOf(twinHedge.origin);
                vertices.splice(_index, 1);
                twinHedge.origin.dispose();
                useHead1 = false;
            }

            hedge.dispose();
            twinHedge.dispose();

            // step 4: add faces

            var face1 = useHead1 ? new Face(this) : null;
            if ( face1 ) {
                face1.wedge = head1;
            }

            var face2 = useHead2 ? new Face(this) : null;
            if ( face2 ) {
                face2.wedge = head2;
            }

            if ( face1 && face2 ) {
                if( face1.equals(face2) ) { 
                    face2.dispose();
                    face2 = null;
                }
            }

            // set hedge face

            if ( face1 ) {

                var h = face1.wedge;
                h.face = face1;
                // And we traverse the boundary of the new face
                while (h.nexthedge !== face1.wedge) {
                    h = h.nexthedge;
                    h.face = face1;
                }

                faces.push(face1);
            }

            if ( face2 ) {

                var h = face2.wedge;
                h.face = face2;
                // And we traverse the boundary of the new face
                while (h.nexthedge !== face2.wedge) {
                    h = h.nexthedge;
                    h.face = face2;
                }

                faces.push(face2);
            }

            // step 5: mark hole dirty

            if ( (face1 && face1.area <= 0) && (face2 && face2.area <= 0) ) {
                // two external face
                for (var i = 0, l = faces.length; i < l; i++) {
                    faces[i]._holesDirty = true;
                }
            } else if ( (face1 && face1.area <= 0 && !face2) || (face2 && face2.area <= 0 && !face1) ) {
                // one external face
                for (var i = 0, l = faces.length; i < l; i++) {
                    faces[i]._holesDirty = true;
                }
            }

        },

        splitEdge: function(x1, y1, x2, y2, splitX, splitY) {

            var vertices = this.vertices;
            var hedges = this.hedges;

            var hedge = this.findHedge(x1, y1, x2, y2);

            if (!hedge) {
                console.warn("splitEdge: found no hedge to split!", x1, y1, x2, y2);
            }

            var twinHedge = hedge.twin;

            // step 1: add 1 Vertex and 4 Hedge

            var splitVertex = new Vertex(splitX, splitY);
            vertices.push(splitVertex);

            // instead of hedge
            var h1 = new Hedge(splitVertex, hedge.origin);
            var h2 = new Hedge(twinHedge.origin, splitVertex);
            hedges.push(h1);
            hedges.push(h2);

            // instead of twinHedge
            var h3 = new Hedge(splitVertex, twinHedge.origin);
            var h4 = new Hedge(twinHedge.origin, splitVertex);
            hedges.push(h3);
            hedges.push(h4);

            // step 2: link faces

            if (hedge.face.wedge === hedge) {
                hedge.face.wedge = h1;
            }
            hedge.face._vertexlistDirty = true; // only vertexlist dirty

            h1.face = hedge.face;
            h2.face = hedge.face;

            if (twinHedge.face.wedge === twinHedge) {
                twinHedge.face.wedge = h3;
            }
            twinHedge.face._vertexlistDirty = true; // only vertexlist dirty

            h3.face = twinHedge.face;
            h4.face = twinHedge.face;

            // step 3: link hedges

            h1.nexthedge = h2;
            h2.prevhedge = h1;

            h3.nexthedge = h4;
            h4.prevhedge = h3;

            h1.prevhedge = (hedge.prevhedge !== twinHedge) ? hedge.prevhedge : h4;
            h1.prevhedge.nexthedge = h1;
            
            h2.nexthedge = (hedge.nexthedge !== twinHedge) ? hedge.nexthedge : h3;
            h2.nexthedge.prevhedge = h2;

            h3.prevhedge = (twinHedge.prevhedge !== hedge) ? twinHedge.prevhedge : h2;
            h3.prevhedge.nexthedge = h3;
            
            h4.nexthedge = (twinHedge.nexthedge !== hedge) ? twinHedge.nexthedge : h1;
            h4.nexthedge.prevhedge = h4;

            h1.twin = h4;
            h2.twin = h3;
            h3.twin = h2;
            h4.twin = h1;

            // step 4: handle hedgelist in vertex

            splitVertex.hedgelist.push(h2, h4);

            var index = hedge.origin.hedgelist.indexOf(hedge);
            hedge.origin.hedgelist.splice(index, 1, h1);

            var index = twinHedge.origin.hedgelist.indexOf(twinHedge);
            twinHedge.origin.hedgelist.splice(index, 1, h3);

            // step 5: remove hedge & twinHedge

            hedge.dispose();
            twinHedge.dispose();

            var index = hedges.indexOf(hedge);
            hedges.splice(index, 1);

            var index = hedges.indexOf(twinHedge);
            hedges.splice(index, 1);

        }

    });

    window.DCEL = DCEL;

})));
