#version 300 es

precision mediump float;

in vec3 frag_pos;
in vec3 frag_normal;
in vec2 frag_texcoord;

uniform vec3 light_ambient;
uniform vec3 light_position;
uniform vec3 light_color;
uniform vec3 camera_position;
uniform vec3 material_color;      // Ka and Kd
uniform vec3 material_specular;   // Ks
uniform float material_shininess; // n
uniform sampler2D image;          // use in conjunction with Ka and Kd

out vec4 FragColor;

float dotPositive(vec3 x, vec3 y) {
    return max(dot(x, y), 0.0);
}

void main() {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;

    vec4 texel = texture(image, frag_texcoord);

    vec3 N = normalize(frag_normal);                          // normalized surface normal
    vec3 L = normalize(light_position - frag_pos);         // normalized light direction // i swapped order of subtraction

    vec3 R = normalize(-(reflect(L,N)));          // normalized reflected light direction
    vec3 V = normalize(camera_position - frag_pos);  // normalized view direction // i swapped order of subtraction

    ambient = light_ambient * light_color;
    diffuse = light_color *  light_color * dotPositive(N, L);
    specular = light_color * material_specular * pow(dotPositive(R,V), material_shininess);


    vec3 result = ambient + diffuse + specular;

    //FragColor = vec4(result, 1.0); // which one?
    FragColor = vec4(result, 1.0) * texel; // which one?

}
