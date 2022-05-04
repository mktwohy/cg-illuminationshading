#version 300 es

precision highp float;

in vec3 vertex_position;
in vec3 vertex_normal;

uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

out vec3 frag_pos;
out vec3 frag_normal;

void main() {
    gl_Position = projection_matrix * view_matrix * model_matrix * vec4(vertex_position, 1.0);

    frag_normal = normalize(frag_normal); // normalize frag_normal
    frag_normal = mat3(transpose(inverse(model_matrix))) * vertex_normal; // inverse transpose similar to gouraud

    vec4 frag_position_w = model_matrix * vec4(vertex_position, 1.0);
    
    frag_pos = frag_position_w.xyz; // set frag_pos to only xyz of frag_position
}
