import axios from "axios";

const getLatestVersion = async (packageName) => {
    try {
        const { data } = await axios.get(`https://registry.npmjs.org/${packageName}`);

        const version = {
            name: packageName,
            version: data["dist-tags"].latest,
        };

        return version;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export { getLatestVersion };