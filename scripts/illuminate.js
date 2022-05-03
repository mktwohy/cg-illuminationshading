const {mat4, vec2, vec3, vec4} = glMatrix;
const color = {
    white:  [1.0, 1.0, 1.0, 1.0],
    red:    [1.0, 0.0, 0.0, 1.0],
    green:  [0.0, 1.0, 0.0, 1.0],
    blue:   [0.0, 0.0, 1.0, 1.0],
}

class GlApp {
    constructor(canvas_id, width, height, scene) {
        // initialize <canvas> with a WebGL 2 context
        /** @type {HTMLCanvasElement} */
        this.canvas = document.getElementById(canvas_id);
        this.canvas.width = width;
        this.canvas.height = height;

        /** @type {WebGL2RenderingContext} */
        this.gl = this.canvas.getContext('webgl2');
        if (!this.gl) {
            alert('Unable to initialize WebGL 2. Your browser may not support it.');
        }

        // initialize local data members
        this.shader = {                              // Each shader object will contain the GPU program
            gouraud_color: null,                     // (vertex shader + fragment shader) and its
            gouraud_texture: null,                   // corresponding uniform variables
            phong_color: null,
            phong_texture: null
        };

        this.vertex_position_attrib = 0;             // vertex attribute 0: 3D position
        this.vertex_normal_attrib = 1;               // vertex attribute 1: 3D normal vector
        this.vertex_texcoord_attrib = 2;             // vertex attribute 2: 2D texture coordinates

        this.projection_matrix = mat4.create();      // projection matrix (on CPU)
        this.view_matrix = mat4.create();            // view matrix (on CPU)
        this.model_matrix = mat4.create();           // model matrix (on CPU)

        this.vertex_array = {                        // model Vertex Array Objects (contains all attributes
            plane: null,                             // of the model - vertices, normals, faces, ...)
            cube: null,
            sphere: null,
            custom: null
        };

        this.scene = scene;                          // current scene to draw (list of models and lights)
        this.algorithm = 'gouraud';                  // current shading algorithm to use for rendering


        // download and compile shaders into GPU program
        let gouraud_color_vs = this.getFile('shaders/gouraud_color.vert');
        let gouraud_color_fs = this.getFile('shaders/gouraud_color.frag');
        let gouraud_texture_vs = this.getFile('shaders/gouraud_texture.vert');
        let gouraud_texture_fs = this.getFile('shaders/gouraud_texture.frag');
        let phong_color_vs = this.getFile('shaders/phong_color.vert');
        let phong_color_fs = this.getFile('shaders/phong_color.frag');
        let phong_texture_vs = this.getFile('shaders/phong_texture.vert');
        let phong_texture_fs = this.getFile('shaders/phong_texture.frag');
        let emissive_vs = this.getFile('shaders/emissive.vert');
        let emissive_fs = this.getFile('shaders/emissive.frag');

        Promise.all([gouraud_color_vs, gouraud_color_fs, gouraud_texture_vs, gouraud_texture_fs,
                     phong_color_vs, phong_color_fs, phong_texture_vs, phong_texture_fs,
                     emissive_vs, emissive_fs])
        .then((shaders) => this.loadAllShaders(shaders))
        .catch((error) => this.getFileError(error));
    }
    
    loadAllShaders(shaders) {
        this.shader.gouraud_color = this.createShaderProgram(shaders[0], shaders[1]);
        this.shader.gouraud_texture = this.createShaderProgram(shaders[2], shaders[3]);
        this.shader.phong_color = this.createShaderProgram(shaders[4], shaders[5]);
        this.shader.phone_texture = this.createShaderProgram(shaders[6], shaders[7]);
        this.shader.emissive = this.createShaderProgram(shaders[8], shaders[9]);

        this.initializeGlApp();
    }
    
    createShaderProgram(vert_source, frag_source) {
        // Compile shader program
        let program = glslCreateShaderProgram(this.gl, vert_source, frag_source);

        // Bind vertex input data locations
        this.gl.bindAttribLocation(program, this.vertex_position_attrib, 'vertex_position');
        this.gl.bindAttribLocation(program, this.vertex_normal_attrib, 'vertex_normal');
        this.gl.bindAttribLocation(program, this.vertex_texcoord_attrib, 'vertex_texcoord');

        // Link shader program
        glslLinkShaderProgram(this.gl, program);

        // Get list of uniforms available in shaders
        let uniforms = glslGetShaderProgramUniforms(this.gl, program);
        
        return {program: program, uniforms: uniforms};
    }

    initializeGlApp() {
        // set drawing area to be the entire framebuffer
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        // set the background color
        this.gl.clearColor(this.scene.background[0], this.scene.background[1], this.scene.background[2], 1.0);
        // enable z-buffer for visible surface determination
        this.gl.enable(this.gl.DEPTH_TEST);

        // create models - plane, cube, sphere, and custom
        this.vertex_array.plane = createPlaneVertexArray(this.gl, this.vertex_position_attrib, 
                                                                  this.vertex_normal_attrib,
                                                                  this.vertex_texcoord_attrib);
        this.vertex_array.cube = createCubeVertexArray(this.gl, this.vertex_position_attrib, 
                                                                this.vertex_normal_attrib,
                                                                this.vertex_texcoord_attrib);
        this.vertex_array.sphere = createSphereVertexArray(this.gl, this.vertex_position_attrib, 
                                                                    this.vertex_normal_attrib,
                                                                    this.vertex_texcoord_attrib);
        this.vertex_array.custom = createCustomVertexArray(this.gl, this.vertex_position_attrib, 
                                                                    this.vertex_normal_attrib,
                                                                    this.vertex_texcoord_attrib);

        // initialize projection matrix with a 45deg field of view
        let fov = 30.0 * (Math.PI / 180.0);
        let aspect = this.canvas.width / this.canvas.height;
        mat4.perspective(this.projection_matrix, fov, aspect, 0.1, 100.0);
        
        // initialize view matrix based on scene's camera location / direction
        let cam_pos = this.scene.camera.position;
        let cam_target = this.scene.camera.target;
        let cam_up = this.scene.camera.up;
        mat4.lookAt(this.view_matrix, cam_pos, cam_target, cam_up);

        // render scene
        this.render();
    }

    createDefaultTexture() {
        let texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR) // or gl.NEAREST
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE) // or gl.NEAS
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
        let pixels = [              // hint, use Google: colorpicker
            255, 255, 255, 255,     // white
            255,   0,   0, 255,     // red
            128, 128, 128, 255,     // teal
            0,   0,   0, 255      // black
        ]
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 2, 2, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array(pixels))
        this.gl.bindTexture(this.gl.TEXTURE_2D, null)
        return texture
    }

    initializeTexture(image_url) {
        // create a texture, and upload a temporary 1px white RGBA array [255,255,255,255]
        let texture = this.gl.createTexture();

        //
        // TODO: set texture parameters and upload a temporary 1px white RGBA array [255,255,255,255]
        // 

        // download the actual image
        let image = new Image();
        image.crossOrigin = 'anonymous';
        image.addEventListener('load', (event) => {
            // once image is downloaded, update the texture image
            this.updateTexture(texture, image);
        }, false);
        image.src = image_url;

        return texture;
    }

    updateTexture(texture, image_element) {
        //
        // TODO: update image for specified texture
        //
    }

    render() {
        // delete previous frame (reset both framebuffer and z-buffer)
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // draw all models
        for (let model of this.scene.models) {
            if (this.vertex_array[model.type] == null) continue;

            let selected_shader = this.shader[this.algorithm + "_color"]

            this.gl.useProgram(selected_shader.program);

            // transform model to proper position, size, and orientation
            glMatrix.mat4.identity(this.model_matrix);
            glMatrix.mat4.translate(this.model_matrix, this.model_matrix, model.center);
            glMatrix.mat4.rotateZ(this.model_matrix, this.model_matrix, model.rotate_z);
            glMatrix.mat4.rotateY(this.model_matrix, this.model_matrix, model.rotate_y);
            glMatrix.mat4.rotateX(this.model_matrix, this.model_matrix, model.rotate_x);
            glMatrix.mat4.scale(this.model_matrix, this.model_matrix, model.size);

            this.gl.uniform3fv(selected_shader.uniforms.material_color, model.material.color);
            this.gl.uniformMatrix4fv(selected_shader.uniforms.projection_matrix, false, this.projection_matrix);
            this.gl.uniformMatrix4fv(selected_shader.uniforms.view_matrix, false, this.view_matrix);
            this.gl.uniformMatrix4fv(selected_shader.uniforms.model_matrix, false, this.model_matrix);

            //
            // TODO: bind proper texture and set uniform (if shader is a textured one)
            // doesn't work:
            // let texture = this.createDefaultTexture()
            // this.gl.activeTexture(this.gl.TEXTURE0)
            // this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
            // this.gl.uniform1i(selected_shader.uniforms.material_color, 0)
            // this.gl.bindTexture(this.gl.TEXTURE_2D, null)




            this.gl.bindVertexArray(this.vertex_array[model.type]);
            this.gl.drawElements(this.gl.TRIANGLES, this.vertex_array[model.type].face_index_count, this.gl.UNSIGNED_SHORT, 0);
            this.gl.bindVertexArray(null);
        }

        // draw all light sources
        for (let point_light of this.scene.light.point_lights) {
            let shader = this.shader['emissive']

            this.gl.useProgram(shader.program);

            glMatrix.mat4.identity(this.model_matrix);
            glMatrix.mat4.translate(this.model_matrix, this.model_matrix, point_light.position);
            glMatrix.mat4.scale(this.model_matrix, this.model_matrix, glMatrix.vec3.fromValues(0.1, 0.1, 0.1));


            this.gl.uniform3fv(shader.uniforms.material_color, point_light.color);
            this.gl.uniformMatrix4fv(shader.uniforms.projection_matrix, false, this.projection_matrix);
            this.gl.uniformMatrix4fv(shader.uniforms.view_matrix, false, this.view_matrix);
            this.gl.uniformMatrix4fv(shader.uniforms.model_matrix, false, this.model_matrix);

            this.gl.bindVertexArray(this.vertex_array['sphere']);
            this.gl.drawElements(this.gl.TRIANGLES, this.vertex_array['sphere'].face_index_count, this.gl.UNSIGNED_SHORT, 0);
            this.gl.bindVertexArray(null);
        }
    }

    updateScene(scene) {
        // update scene
        this.scene = scene;
        
        // set the background color
        this.gl.clearColor(this.scene.background[0], this.scene.background[1], this.scene.background[2], 1.0);
        
        // update view matrix based on camera properties
        let cam_pos = this.scene.camera.position;
        let cam_target = this.scene.camera.target;
        let cam_up = this.scene.camera.up;
        glMatrix.mat4.lookAt(this.view_matrix, cam_pos, cam_target, cam_up);

        // render scene
        this.render();
    }

    setShadingAlgorithm(algorithm) {
        // update shading algorithm
        this.algorithm = algorithm;

        // render scene
        this.render();
    }

    getFile(url) {
        return new Promise((resolve, reject) => {
            let req = new XMLHttpRequest();
            req.onreadystatechange = function() {
                if (req.readyState === 4 && req.status === 200) {
                    resolve(req.response);
                }
                else if (req.readyState === 4) {
                    reject({url: req.responseURL, status: req.status});
                }
            };
            req.open('GET', url, true);
            req.send();
        });
    }

    getFileError(error) {
        console.log('Error:', error);
    }
}
