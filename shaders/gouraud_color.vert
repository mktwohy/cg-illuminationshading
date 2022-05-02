#version 300 es

precision highp float;

in vec3 vertex_position;
in vec3 vertex_normal;

uniform vec3 light_ambient;
uniform vec3 light_position;
uniform vec3 light_color;
uniform vec3 camera_position;
uniform float material_shininess; // n
uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

out vec3 ambient;
out vec3 diffuse;
out vec3 specular;

void main() {
    gl_Position = projection_matrix * view_matrix * model_matrix * vec4(vertex_position, 1.0);

    vec3 new_normal = normalize(mat3(transpose(inverse(model_matrix))) * vertex_normal);
    vec4 new_position = model_matrix * vec4(vertex_position, 1.0);
    vec3 new_position_xyz = new_position.xyz;

    vec3 n = normalize(new_normal);
    vec3 l = normalize(light_position - new_normal);

    vec3 r = 2.0 * (max(dot(n,l), 0.0)) * (n-l);
    vec3 v = normalize(camera_position - new_position_xyz);


    ambient = light_ambient * material_shininess;
    diffuse = light_color * material_shininess * max(dot(n,l), 0.0);
    specular = light_color * material_shininess * pow(max(dot(r,v), 0.0), material_shininess);
}
