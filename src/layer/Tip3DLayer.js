import {
    ConeGeometry,
    CustomBlending,
    DirectionalLight,
    Mesh,
    MeshPhongMaterial,
    OneMinusSrcAlphaFactor,
    OrthographicCamera,
    Scene,
    SrcAlphaFactor,
    Vector2,
    Vector3,
    WebGLRenderer
} from 'three'
import {buildModule} from "@src/builder";
import {getRenderTarget} from "@src/utils";
import {loadModules} from "esri-loader";


async function Tip3DLayerBuilder() {
    const [
        watchUtils, GraphicsLayer, BaseLayerViewGL2D,
        Extent, projection, kernel
    ] = await loadModules([
        "esri/core/watchUtils",
        "esri/layers/GraphicsLayer",
        "esri/views/2d/layers/BaseLayerViewGL2D",
        "esri/geometry/Extent",
        "esri/geometry/projection",
        "esri/kernel"
    ]);
    await projection.load();
    const ALPHA = Math.PI / 6;
    const CustomLayerView2D = BaseLayerViewGL2D.createSubclass({
        DEFAULT_SIZE: 50,
        DEFAULT_COLOR: '#1980cc',
        DEFAULT_EMISSIVE: '#1c7ad1',
        COS: Math.cos(ALPHA),
        SIN: Math.sin(ALPHA),
        constructor: function () {
            this._handlers = [];
            this.fullExtent = null;
            this.projCache = new WeakMap()
        },

        attach: function () {
            const renderer = new WebGLRenderer({
                canvas: this.context.canvas,
                gl: this.context,
            });
            renderer.autoClear = false;

            const light = new DirectionalLight('white', 1);
            light.position.set(1, 1, 1);
            const camera = new OrthographicCamera();
            camera.name = 'camera';
            camera.position.set(0, 0, 1);
            camera.lookAt(0, 0, 0);

            const h = 1.5;
            const tip = new Mesh(
                new ConeGeometry(1, h, 4, 1),
                new MeshPhongMaterial({
                    flatShading: true,
                    specular: '#111111',
                    shininess: 70,
                    depthTest: false,
                    blending: CustomBlending,
                    blendSrc: SrcAlphaFactor,
                    blendDst: OneMinusSrcAlphaFactor
                })
            )
            tip.geometry.translate(0, -h, 0).rotateX(Math.PI);
            tip.frustumCulled = false;
            const tipScene = new Scene().add(tip, light);
            tipScene.rotateX(ALPHA);
            Object.assign(this, {
                renderer, light, camera, tip, tipScene
            });
            const viewSR = this.view.spatialReference;
            const projCache = this.projCache;
            const handleDataChange = change => {
                if (this.destroyed) return;
                const adds = change.added ? [...change.added] : null;
                const graphics = this.layer.graphics._items;
                if (!graphics.length) return;
                adds && adds.forEach(({geometry}) => {
                    if (geometry.type !== 'point') return;
                    if (!viewSR.equals(geometry.spatialReference)) {
                        const proj = projection.project(geometry, viewSR);
                        projCache.set(geometry,proj);
                    } else {
                        projCache.set(geometry,geometry);
                    }
                });
                const allProjs = graphics.map(g => projCache.get(g.geometry)).filter(Boolean);
                const xs = allProjs.map(p => p.x);
                const ys = allProjs.map(p => p.y);
                const extent = new Extent({
                    xmin: Math.min.call(null, ...xs),
                    xmax: Math.max.call(null, ...xs),
                    ymin: Math.min.call(null, ...ys),
                    ymax: Math.max.call(null, ...ys),
                    spatialReference: viewSR.clone()
                });
                if (extent.xmin === extent.xmax) extent.xmax += 0.001;
                if (extent.ymin === extent.ymax) extent.ymax += 0.001;
                this.layer.fullExtent = this.fullExtent = extent;
                this.requestRender();
            }
            this._handlers.push(watchUtils.on(this, "layer.graphics", "change", handleDataChange));
            this._handlers.push({
                remove: () => {
                    tip.material.dispose();
                    tip.geometry.dispose();
                    renderer.dispose();
                    this.renderer = this.light = this.camera = this.tip = this.tipScene = null;
                }
            });
            handleDataChange({
                added: this.layer.graphics._items,
                moved: [],
                removed: [],
                target: this.layer.graphics,
            });
        },

        detach: function () {
            this._handlers.forEach(i => i.remove());
            this._handlers = [];
        },

        render: function ({state}) {
            if (this.destroyed) return;
            if (!this.layer.visible
                || !this.fullExtent
                || !state.extent.intersects(this.fullExtent)
            ) return;
            const hasShow = this.layer.graphics.find(g => g.visible);
            if (!hasShow) return;
            // a graphic can only in one esri.Collection, if filter, graphic will be remove from old Collection
            const renderInfos = this.layer.graphics._items
                .filter(g => g.visible)
                .map(g => this.calcRenderInfo(g))
                .filter(Boolean)
            if (!renderInfos?.length) return;
            const gl = this.context;
            const {renderer, tipScene, tip, camera, light} = this;
            const {framebuffer, viewport} = getRenderTarget.call(this, kernel.version);

            const aspect = viewport[2] / viewport[3];
            camera.left = -aspect;
            camera.right = aspect;
            camera.updateProjectionMatrix();

            renderer.resetState();
            renderer.setViewport(viewport[0], viewport[1], viewport[2], viewport[3]);
            renderer.state.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

            //TODO use instance draw to improve
            renderInfos.forEach(({position, scale, rotation, color, emissive}) => {
                tip.position.copy(position);
                tip.scale.copy(scale)
                tip.rotation.set(rotation.x, rotation.y, rotation.z);
                tip.material.color.set(color);
                tip.material.emissive.set(emissive);
                light.target.position.copy(tip.position);
                renderer.render(tipScene, camera);
            })

            this.requestRender()
        },

        calcRenderInfo(graphic) {
            const proj = this.projCache.get(graphic.geometry);
            if (!proj) return;
            let renderInfo = graphic._renderInfo;
            if (!renderInfo) {
                renderInfo = {
                    position: new Vector3(),
                    scale: new Vector3(),
                    rotation: new Vector3(),
                    color: null,
                    emissive: null
                }
                graphic._renderInfo = renderInfo;
            }

            const {position, scale, rotation} = renderInfo;

            const state = this.view.state;
            const viewSize = state.size;
            const screenPos = this.view.toScreen(proj);
            const _pos = transform(screenPos, viewSize[0], viewSize[1], state.pixelRatio);

            position.set(_pos.x, _pos.y * this.COS, -_pos.y * this.SIN);

            const _scale = new Vector2(1, 1)
                .multiplyScalar(state.pixelRatio * (graphic.attributes?.size || this.DEFAULT_SIZE))
                .multiply({
                    x: 1 / viewSize[1],
                    y: 1 / viewSize[1]
                })
            scale.set(_scale.x, _scale.y, _scale.x);

            position.y += Math.cos(performance.now() * 0.0035) * 0.5 * _scale.y;
            rotation.y += 0.009;

            renderInfo.color = graphic.attributes?.color || this.DEFAULT_COLOR
            renderInfo.emissive = graphic.attributes?.emissive || this.DEFAULT_EMISSIVE

            return renderInfo;

            function transform({x, y}, w, h, dpr) {
                const aspect = w / h;
                return new Vector2(
                    2 * aspect * x * dpr / w - aspect,
                    -2 * y * dpr / h + 1
                )
            }
        }
    });
    return GraphicsLayer.createSubclass({
        createLayerView: function (view) {
            const temp = new CustomLayerView2D({
                view: view,
                layer: this
            });
            this.layerView = temp;
            return temp;
        }
    });
}

export async function loadTip3DLayer(opts) {
    const ctor = await buildModule(Tip3DLayerBuilder)
    return new ctor(opts);
}
